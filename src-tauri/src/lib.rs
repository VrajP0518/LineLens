use std::fs;
use std::io::{Cursor, Read, Write};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;

#[derive(Serialize)]
struct CommandResult {
    command_name: String,
    command: String,
    success: bool,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
    started_at: String,
    finished_at: String,
    duration_ms: u128,
    repo_detected: bool,
    python_detected: bool,
    venv_detected: bool,
    scripts_detected: bool,
}

struct CommandSpec {
    script: &'static str,
    args: Vec<&'static str>,
}

#[derive(Deserialize)]
struct ApiKeysInput {
    #[serde(default)]
    odds_api_key: Option<String>,
    #[serde(default)]
    sharp_odds_api_key: Option<String>,
    #[serde(default)]
    propline_api_key: Option<String>,
}

#[derive(Serialize)]
struct ApiKeyStatus {
    available: bool,
    odds_api_key: bool,
    sharp_odds_api_key: bool,
    propline_api_key: bool,
    message: String,
}

#[derive(Serialize)]
struct DiagnosticCheck {
    id: String,
    label: String,
    status: String,
    detail: String,
}

#[derive(Serialize)]
struct RuntimeDiagnostics {
    available: bool,
    status: String,
    message: String,
    checks: Vec<DiagnosticCheck>,
    api_keys: ApiKeyStatus,
}

const RUNTIME_VERSION_FILE: &str = ".linelens-runtime-version";
const SHARED_DATA_MANIFEST_URL: &str = "https://github.com/VrajP0518/LineLens/releases/download/data-channel-v6/shared-data-manifest.json";
const SHARED_DATA_CHANNEL_PREFIX: &str =
    "https://github.com/VrajP0518/LineLens/releases/download/data-channel-v6/";
const SHARED_DATA_MAX_BYTES: usize = 100 * 1024 * 1024;
const PROVIDER_KEY_NAMES: [&str; 3] = ["ODDS_API_KEY", "SHARP_ODDS_API_KEY", "PROPLINE_API_KEY"];
static RUNTIME_SEED_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
static REFRESH_PROCESS_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

// Release builds may receive these values from GitHub Actions at compile time.
// They are intentionally separate from the normal runtime environment names so
// a developer's local environment cannot accidentally bake a key into a build.
const DEFAULT_ODDS_API_KEY: Option<&str> = option_env!("LINELENS_DEFAULT_ODDS_API_KEY");
const DEFAULT_SHARP_ODDS_API_KEY: Option<&str> = option_env!("LINELENS_DEFAULT_SHARP_ODDS_API_KEY");
const DEFAULT_PROPLINE_API_KEY: Option<&str> = option_env!("LINELENS_DEFAULT_PROPLINE_API_KEY");

#[derive(Deserialize)]
struct SharedDataBundle {
    url: String,
    sha256: String,
    size: u64,
}

#[derive(Deserialize)]
struct SharedDataFile {
    path: String,
    sha256: String,
    size: u64,
}

#[derive(Deserialize)]
struct SharedDataManifest {
    schema_version: u8,
    channel: String,
    app_major: u8,
    data_version: String,
    generated_at: String,
    commit_sha: String,
    bundle: SharedDataBundle,
    files: Vec<SharedDataFile>,
}

#[derive(Serialize)]
struct SharedDataResult {
    success: bool,
    updated: bool,
    data_version: String,
    generated_at: String,
    message: String,
}

fn espn_live_scoreboards_inner() -> Result<serde_json::Value, String> {
    let feeds = [
        ("MLB", "baseball", "mlb"),
        ("NFL", "football", "nfl"),
        ("WNBA", "basketball", "wnba"),
        ("NBA", "basketball", "nba"),
        ("NHL", "hockey", "nhl"),
    ];
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("LineLens-v6-live-score-client")
        .build()
        .map_err(|error| error.to_string())?;
    let mut games = Vec::new();
    let mut warnings = Vec::new();

    for (sport, category, league) in feeds {
        let url = format!(
            "https://site.api.espn.com/apis/site/v2/sports/{category}/{league}/scoreboard?limit=1000"
        );
        let response = match client
            .get(&url)
            .send()
            .and_then(|value| value.error_for_status())
        {
            Ok(value) => value,
            Err(error) => {
                warnings.push(format!("{sport} scoreboard unavailable: {error}"));
                continue;
            }
        };
        let bytes = response
            .bytes()
            .map_err(|error| format!("Unable to read the {sport} scoreboard: {error}"))?;
        let payload: serde_json::Value = serde_json::from_slice(&bytes)
            .map_err(|error| format!("Unable to parse the {sport} scoreboard: {error}"))?;
        let Some(events) = payload.get("events").and_then(|value| value.as_array()) else {
            continue;
        };
        for event in events {
            let Some(competition) = event
                .get("competitions")
                .and_then(|value| value.as_array())
                .and_then(|values| values.first())
            else {
                continue;
            };
            let competitors = competition
                .get("competitors")
                .and_then(|value| value.as_array())
                .cloned()
                .unwrap_or_default();
            let side = |name: &str| {
                competitors.iter().find(|competitor| {
                    competitor.get("homeAway").and_then(|value| value.as_str()) == Some(name)
                })
            };
            let (Some(away), Some(home)) = (side("away"), side("home")) else {
                continue;
            };
            let team_value = |competitor: &serde_json::Value, key: &str| {
                competitor
                    .get("team")
                    .and_then(|team| team.get(key))
                    .and_then(|value| value.as_str())
                    .unwrap_or_default()
                    .to_string()
            };
            let status_type = competition
                .get("status")
                .and_then(|value| value.get("type"))
                .cloned()
                .unwrap_or(serde_json::Value::Null);
            let state = status_type
                .get("state")
                .and_then(|value| value.as_str())
                .unwrap_or_default()
                .to_lowercase();
            let completed = status_type
                .get("completed")
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
            let status = if completed || state == "post" {
                "Final"
            } else if state == "in" {
                "In Progress"
            } else {
                "Scheduled"
            };
            let detail = if status == "Scheduled" {
                "Scheduled".to_string()
            } else {
                status_type
                    .get("shortDetail")
                    .or_else(|| status_type.get("detail"))
                    .and_then(|value| value.as_str())
                    .unwrap_or(status)
                    .to_string()
            };
            let game_time = competition
                .get("date")
                .or_else(|| event.get("date"))
                .and_then(|value| value.as_str())
                .unwrap_or_default();
            let situation = competition
                .get("situation")
                .cloned()
                .unwrap_or(serde_json::Value::Null);
            games.push(serde_json::json!({
                "sport": sport,
                "game_id": event.get("id").and_then(|value| value.as_str()).unwrap_or_default(),
                "game_date": game_time.get(..10).unwrap_or_default(),
                "game_time": game_time,
                "status": status,
                "status_detail": detail,
                "source": "ESPN Scoreboard API",
                "source_status": "direct_live_fresh",
                "source_type": "live",
                "away": team_value(away, "abbreviation"),
                "home": team_value(home, "abbreviation"),
                "away_display": team_value(away, "displayName"),
                "home_display": team_value(home, "displayName"),
                "away_logo": team_value(away, "logo"),
                "home_logo": team_value(home, "logo"),
                "away_score": away.get("score").cloned().unwrap_or(serde_json::Value::Null),
                "home_score": home.get("score").cloned().unwrap_or(serde_json::Value::Null),
                "inning": competition.get("status").and_then(|value| value.get("period")).cloned().unwrap_or(serde_json::Value::Null),
                "inning_state": status_type.get("shortDetail").cloned().unwrap_or(serde_json::Value::Null),
                "clock": competition.get("status").and_then(|value| value.get("displayClock")).cloned().unwrap_or(serde_json::Value::Null),
                "balls": situation.get("balls").cloned().unwrap_or(serde_json::Value::Null),
                "strikes": situation.get("strikes").cloned().unwrap_or(serde_json::Value::Null),
                "outs": situation.get("outs").cloned().unwrap_or(serde_json::Value::Null),
                "bases": {
                    "first": situation.get("onFirst").and_then(|value| value.as_bool()).unwrap_or(false),
                    "second": situation.get("onSecond").and_then(|value| value.as_bool()).unwrap_or(false),
                    "third": situation.get("onThird").and_then(|value| value.as_bool()).unwrap_or(false)
                },
                "prediction_status": "scoreboard_only"
            }));
        }
    }

    if games.is_empty() && !warnings.is_empty() {
        return Err(warnings.join(" | "));
    }
    Ok(serde_json::json!({
        "metadata": {
            "generated_at": timestamp(),
            "source": "Direct ESPN scoreboard feeds",
            "source_status": "direct_live_fresh",
            "refresh_mode": "direct_live",
            "live_poll_seconds_recommended": 30,
            "warnings": warnings,
            "row_count": games.len()
        },
        "games": games
    }))
}

#[tauri::command]
async fn fetch_live_scoreboards() -> Result<serde_json::Value, String> {
    tauri::async_runtime::spawn_blocking(espn_live_scoreboards_inner)
        .await
        .map_err(|error| format!("Live scoreboard task failed: {error}"))?
}

fn background_command(program: &str) -> Command {
    let mut command = Command::new(program);
    #[cfg(windows)]
    command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    command
}

fn project_root() -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let mut candidates = Vec::new();
    if let Some(path) = manifest_dir.parent() {
        candidates.push(path.to_path_buf());
    }
    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            candidates.push(parent.to_path_buf());
            candidates.push(parent.join("resources"));
            candidates.push(parent.join("resources").join("resources"));
            candidates.push(parent.join("resources").join("runtime"));
            candidates.push(parent.join("runtime"));
        }
    }
    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir);
    }

    candidates.dedup();
    for candidate in candidates {
        if candidate.join("scripts").join("refresh_data.py").exists() {
            return Ok(candidate);
        }
    }
    Err("Unable to resolve a LineLens project root containing scripts/refresh_data.py.".to_string())
}

fn bundled_source_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidates = [
            resource_dir.clone(),
            resource_dir.join("runtime"),
            resource_dir.join("resources"),
            resource_dir.join("resources").join("runtime"),
        ];
        for candidate in candidates {
            if candidate.join("scripts").join("refresh_data.py").exists() {
                return Ok(candidate);
            }
        }
    }
    project_root().map_err(|_| {
        "Bundled LineLens runtime files are missing. Install a current Windows build with the runtime resources included.".to_string()
    })
}

fn copy_directory(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_directory(&source_path, &destination_path)?;
        } else {
            fs::copy(&source_path, &destination_path).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn copy_missing_directory(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_missing_directory(&source_path, &destination_path)?;
        } else if !destination_path.exists() {
            fs::copy(&source_path, &destination_path).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn runtime_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let seed_lock = RUNTIME_SEED_LOCK.get_or_init(|| Mutex::new(()));
    let _seed_guard = seed_lock
        .lock()
        .map_err(|_| "LineLens runtime initialization lock was poisoned.".to_string())?;
    let source = bundled_source_root(app)?;
    let local_data = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Unable to resolve LineLens local data directory: {}", error))?;
    let runtime = local_data.join("runtime");
    fs::create_dir_all(&runtime).map_err(|error| error.to_string())?;

    let version = env!("CARGO_PKG_VERSION");
    let marker = runtime.join(RUNTIME_VERSION_FILE);
    let needs_bundle_seed = fs::read_to_string(&marker)
        .map(|value| value.trim() != version)
        .unwrap_or(true)
        || !runtime.join("scripts").join("refresh_data.py").exists()
        || !runtime.join("scripts").join("update_models.py").exists();

    if needs_bundle_seed {
        copy_directory(&source.join("scripts"), &runtime.join("scripts"))?;
        copy_directory(&source.join("src"), &runtime.join("src"))?;
        copy_directory(&source.join("models"), &runtime.join("models"))?;
        let requirements = source.join("requirements.txt");
        if requirements.exists() {
            fs::copy(&requirements, runtime.join("requirements.txt"))
                .map_err(|error| error.to_string())?;
        }
        let source_env = source.join(".env");
        let runtime_env = runtime.join(".env");
        if source_env.exists() && !runtime_env.exists() {
            fs::copy(source_env, runtime_env).map_err(|error| error.to_string())?;
        }
        copy_missing_directory(&source.join("data"), &runtime.join("data"))?;
        // Release identity belongs to the installed binary, not to an older
        // writable runtime snapshot. Always replace these two files during an
        // app-version migration while preserving generated/user data.
        for metadata_name in ["app_metadata.json", "app_metadata.js"] {
            let bundled_metadata = source.join("data").join(metadata_name);
            if bundled_metadata.exists() {
                fs::copy(&bundled_metadata, runtime.join("data").join(metadata_name))
                    .map_err(|error| error.to_string())?;
            }
        }
        fs::write(&marker, version).map_err(|error| error.to_string())?;
    }

    if !runtime.join("scripts").join("refresh_data.py").exists() {
        return Err("LineLens runtime files could not be initialized.".to_string());
    }
    Ok(runtime)
}

fn env_key_value(path: &Path, key: &str) -> Option<String> {
    let contents = fs::read_to_string(path).ok()?;
    contents.lines().find_map(|line| {
        let trimmed = line.trim_start();
        if trimmed.starts_with('#') {
            return None;
        }
        let Some((name, value)) = trimmed.split_once('=') else {
            return None;
        };
        if name.trim() != key {
            return None;
        }
        let value = value
            .trim()
            .trim_matches(|character| character == '"' || character == '\'')
            .trim();
        (!value.is_empty()).then(|| value.to_string())
    })
}

fn bundled_default_key(key: &str) -> Option<&'static str> {
    let value = match key {
        "ODDS_API_KEY" => DEFAULT_ODDS_API_KEY,
        "SHARP_ODDS_API_KEY" => DEFAULT_SHARP_ODDS_API_KEY,
        "PROPLINE_API_KEY" => DEFAULT_PROPLINE_API_KEY,
        _ => None,
    }?;
    (!value.trim().is_empty()).then_some(value)
}

fn effective_key(root: &Path, key: &str) -> Option<String> {
    if let Ok(value) = std::env::var(key) {
        let value = value.trim();
        if !value.is_empty() {
            return Some(value.to_string());
        }
    }
    env_key_value(&root.join(".env"), key).or_else(|| bundled_default_key(key).map(str::to_string))
}

fn api_key_configured(root: &Path, key: &str) -> bool {
    effective_key(root, key).is_some()
}

fn configure_provider_environment(command: &mut Command, root: &Path) {
    for key in PROVIDER_KEY_NAMES {
        // Preserve an explicit process environment value. Otherwise provide the
        // user's saved .env value, falling back to the release default.
        let process_has_value = std::env::var(key)
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false);
        if !process_has_value {
            if let Some(value) = env_key_value(&root.join(".env"), key)
                .or_else(|| bundled_default_key(key).map(str::to_string))
            {
                command.env(key, value);
            }
        }
    }
}

fn api_key_status(root: &Path) -> ApiKeyStatus {
    ApiKeyStatus {
        available: true,
        odds_api_key: api_key_configured(root, "ODDS_API_KEY"),
        sharp_odds_api_key: api_key_configured(root, "SHARP_ODDS_API_KEY"),
        propline_api_key: api_key_configured(root, "PROPLINE_API_KEY"),
        message: "Release defaults and locally saved keys are used for refreshes; keys are never written to data exports.".to_string(),
    }
}

fn trimmed_key(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn write_api_keys(root: &Path, input: ApiKeysInput) -> Result<ApiKeyStatus, String> {
    let env_path = root.join(".env");
    let existing = fs::read_to_string(&env_path).unwrap_or_default();
    let updates = vec![
        ("ODDS_API_KEY", trimmed_key(input.odds_api_key)),
        ("SHARP_ODDS_API_KEY", trimmed_key(input.sharp_odds_api_key)),
        ("PROPLINE_API_KEY", trimmed_key(input.propline_api_key)),
    ];
    let mut seen = std::collections::HashSet::new();
    let mut lines = Vec::new();

    for line in existing.lines() {
        let trimmed = line.trim_start();
        let name = trimmed
            .split_once('=')
            .map(|(name, _)| name.trim())
            .unwrap_or_default();
        if let Some((managed_name, value)) = updates.iter().find(|(key, _)| *key == name) {
            if value.is_none() {
                lines.push(line.to_string());
            } else if seen.insert(*managed_name) {
                if let Some(value) = value {
                    lines.push(format!("{}={}", managed_name, value));
                }
            }
        } else {
            lines.push(line.to_string());
        }
    }

    for (name, value) in &updates {
        if let Some(value) = value {
            if seen.insert(*name) {
                lines.push(format!("{}={}", name, value));
            }
        }
    }

    fs::write(&env_path, format!("{}\n", lines.join("\n")))
        .map_err(|error| format!("Unable to save local API keys: {}", error))?;
    Ok(api_key_status(root))
}

fn scripts_detected(root: &PathBuf) -> bool {
    root.join("scripts").join("bootstrap_env.py").exists()
        && root
            .join("scripts")
            .join("startup_orchestrator.py")
            .exists()
        && root.join("scripts").join("refresh_data.py").exists()
        && root
            .join("scripts")
            .join("score_model_predictions.py")
            .exists()
        && root.join("scripts").join("live_scores.py").exists()
        && root.join("scripts").join("odds_snapshots.py").exists()
        && root
            .join("scripts")
            .join("refresh_mlb_player_games.py")
            .exists()
        && root
            .join("scripts")
            .join("refresh_wnba_availability.py")
            .exists()
        && root
            .join("scripts")
            .join("refresh_player_props_pipeline.py")
            .exists()
        && root.join("scripts").join("update_models.py").exists()
}

fn shared_data_allowed_path(path: &str) -> bool {
    matches!(
        path,
        "data/refresh_status.json"
            | "data/live/live_heartbeat.json"
            | "data/live/live_scores.json"
            | "data/live/live_widget.json"
            | "data/live/result_history.json"
            | "data/odds/odds_snapshots.json"
            | "data/odds/player_props.json"
            | "data/odds/odds_health.json"
            | "data/odds/props_matching_diagnostics.json"
            | "data/odds/wnba_availability.json"
            | "data/predictions/mlb_predictions.json"
            | "data/predictions/wnba_predictions.json"
            | "data/predictions/nfl_predictions.json"
            | "data/tracking/model_predictions_log.json"
            | "data/tracking/model_record.json"
            | "data/tracking/prop_prediction_log.json"
            | "data/tracking/prop_record.json"
    )
}

fn sha256_bytes(value: &[u8]) -> String {
    let mut digest = Sha256::new();
    digest.update(value);
    format!("{:x}", digest.finalize())
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 1024 * 1024];
    loop {
        let count = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

fn download_shared_bytes(url: &str, maximum: usize) -> Result<Vec<u8>, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .user_agent("LineLens-v6-shared-data-client")
        .build()
        .map_err(|error| error.to_string())?;
    let response = client
        .get(url)
        .send()
        .and_then(|response| response.error_for_status())
        .map_err(|error| format!("Shared data download failed: {error}"))?;
    if response.content_length().unwrap_or_default() > maximum as u64 {
        return Err("Shared data download exceeded the size limit.".to_string());
    }
    let mut bytes = Vec::new();
    response
        .take(maximum as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    if bytes.len() > maximum {
        return Err("Shared data download exceeded the size limit.".to_string());
    }
    Ok(bytes)
}

fn shared_data_status_path(root: &Path) -> PathBuf {
    root.join("data").join("shared_data_status.json")
}

fn write_shared_data_status(
    root: &Path,
    status: &str,
    result: &SharedDataResult,
    commit_sha: Option<&str>,
    bundle_sha256: Option<&str>,
) -> Result<(), String> {
    let path = shared_data_status_path(root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let payload = serde_json::json!({
        "status": status,
        "success": result.success,
        "updated": result.updated,
        "data_version": result.data_version,
        "generated_at": result.generated_at,
        "checked_at": timestamp(),
        "commit_sha": commit_sha,
        "bundle_sha256": bundle_sha256,
        "channel": "data-v6",
        "message": result.message,
        "contains_api_keys": false,
    });
    fs::write(
        path,
        serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

fn installed_shared_data_identity(root: &Path) -> Option<(String, String)> {
    let contents = fs::read_to_string(shared_data_status_path(root)).ok()?;
    let payload: serde_json::Value = serde_json::from_str(&contents).ok()?;
    let version = payload
        .get("data_version")
        .and_then(|value| value.as_str())
        .map(str::to_string)?;
    let bundle_sha256 = payload
        .get("bundle_sha256")
        .and_then(|value| value.as_str())
        .map(str::to_string)?;
    Some((version, bundle_sha256))
}

fn sync_shared_data_inner(app: &tauri::AppHandle) -> Result<SharedDataResult, String> {
    let root = runtime_root(app)?;
    let manifest_bytes = download_shared_bytes(SHARED_DATA_MANIFEST_URL, 2 * 1024 * 1024)?;
    let manifest: SharedDataManifest =
        serde_json::from_slice(&manifest_bytes).map_err(|error| error.to_string())?;
    if manifest.schema_version != 1 || manifest.channel != "data-v6" || manifest.app_major != 6 {
        return Err("Shared data manifest is not an approved LineLens v6 channel.".to_string());
    }
    if !manifest.bundle.url.starts_with(SHARED_DATA_CHANNEL_PREFIX)
        || manifest.bundle.sha256.len() != 64
        || manifest.bundle.size as usize > SHARED_DATA_MAX_BYTES
        || manifest.files.is_empty()
    {
        return Err("Shared data manifest failed channel validation.".to_string());
    }
    let mut expected = std::collections::BTreeMap::new();
    for entry in &manifest.files {
        if !shared_data_allowed_path(&entry.path)
            || entry.sha256.len() != 64
            || expected.insert(entry.path.clone(), entry).is_some()
        {
            return Err(format!("Disallowed shared data artifact: {}", entry.path));
        }
    }

    let installed_identity = installed_shared_data_identity(&root);
    let manifest_identity = (
        manifest.data_version.as_str(),
        manifest.bundle.sha256.as_str(),
    );
    if installed_identity
        .as_ref()
        .map(|(version, sha256)| (version.as_str(), sha256.as_str()))
        == Some(manifest_identity)
    {
        let result = SharedDataResult {
            success: true,
            updated: false,
            data_version: manifest.data_version,
            generated_at: manifest.generated_at,
            message: "Shared sports data is already current.".to_string(),
        };
        write_shared_data_status(
            &root,
            "current",
            &result,
            Some(&manifest.commit_sha),
            Some(&manifest.bundle.sha256),
        )?;
        return Ok(result);
    }

    let bundle_bytes = download_shared_bytes(&manifest.bundle.url, SHARED_DATA_MAX_BYTES)?;
    if bundle_bytes.len() as u64 != manifest.bundle.size
        || sha256_bytes(&bundle_bytes) != manifest.bundle.sha256
    {
        return Err("Shared data bundle hash or size did not match the manifest.".to_string());
    }

    let staging = root.join(".shared-data-staging");
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(&staging).map_err(|error| error.to_string())?;
    let mut archive =
        zip::ZipArchive::new(Cursor::new(bundle_bytes)).map_err(|error| error.to_string())?;
    let mut archive_names = std::collections::BTreeSet::new();
    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|error| error.to_string())?;
        if file.is_dir() {
            continue;
        }
        let name = file.name().replace('\\', "/");
        let entry = expected
            .get(&name)
            .ok_or_else(|| format!("Unexpected file in shared data bundle: {name}"))?;
        if !archive_names.insert(name.clone()) {
            return Err(format!("Duplicate file in shared data bundle: {name}"));
        }
        let destination = staging.join(&name);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let mut output = fs::File::create(&destination).map_err(|error| error.to_string())?;
        std::io::copy(&mut file, &mut output).map_err(|error| error.to_string())?;
        output.flush().map_err(|error| error.to_string())?;
        let size = fs::metadata(&destination)
            .map_err(|error| error.to_string())?
            .len();
        if size != entry.size || sha256_file(&destination)? != entry.sha256 {
            return Err(format!("Shared data artifact verification failed: {name}"));
        }
    }
    if archive_names.len() != expected.len()
        || archive_names
            .iter()
            .any(|name| !expected.contains_key(name))
    {
        return Err("Shared data bundle contents did not exactly match the manifest.".to_string());
    }

    let backup_id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    let backup_root = root
        .join("data")
        .join("shared_data_backups")
        .join(backup_id);
    for entry in &manifest.files {
        let destination = root.join(&entry.path);
        if destination.exists() {
            let backup = backup_root.join(&entry.path);
            if let Some(parent) = backup.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            fs::copy(&destination, backup).map_err(|error| error.to_string())?;
        }
    }
    for entry in &manifest.files {
        let staged = staging.join(&entry.path);
        let destination = root.join(&entry.path);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let pending = destination.with_extension("json.shared-new");
        fs::copy(&staged, &pending).map_err(|error| error.to_string())?;
        if destination.exists() {
            fs::remove_file(&destination).map_err(|error| error.to_string())?;
        }
        fs::rename(&pending, &destination).map_err(|error| error.to_string())?;
    }
    fs::remove_dir_all(&staging).map_err(|error| error.to_string())?;

    let result = SharedDataResult {
        success: true,
        updated: true,
        data_version: manifest.data_version,
        generated_at: manifest.generated_at,
        message: "Verified shared scores, odds, props, and predictions were installed.".to_string(),
    };
    write_shared_data_status(
        &root,
        "installed",
        &result,
        Some(&manifest.commit_sha),
        Some(&manifest.bundle.sha256),
    )?;
    Ok(result)
}

#[tauri::command]
async fn sync_shared_data(app: tauri::AppHandle) -> Result<SharedDataResult, String> {
    tauri::async_runtime::spawn_blocking(move || sync_shared_data_inner(&app))
        .await
        .map_err(|error| format!("Shared data task failed: {error}"))?
}

#[tauri::command]
fn read_data_export(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let normalized = path.replace('\\', "/");
    if !normalized.starts_with("data/")
        || normalized.contains("..")
        || normalized.contains(':')
        || !normalized.ends_with(".json")
    {
        return Err("Only bundled data JSON exports can be read.".to_string());
    }
    let root = runtime_root(&app)?;
    fs::read_to_string(root.join(normalized)).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_api_key_status(app: tauri::AppHandle) -> Result<ApiKeyStatus, String> {
    let root = runtime_root(&app)?;
    Ok(api_key_status(&root))
}

#[tauri::command]
fn save_api_keys(app: tauri::AppHandle, input: ApiKeysInput) -> Result<ApiKeyStatus, String> {
    let root = runtime_root(&app)?;
    write_api_keys(&root, input)
}

fn diagnostic_check(
    id: &str,
    label: &str,
    ready: bool,
    detail: impl Into<String>,
) -> DiagnosticCheck {
    DiagnosticCheck {
        id: id.to_string(),
        label: label.to_string(),
        status: if ready { "ready" } else { "attention" }.to_string(),
        detail: detail.into(),
    }
}

fn collect_runtime_diagnostics(app: &tauri::AppHandle) -> Result<RuntimeDiagnostics, String> {
    let source = bundled_source_root(app).ok();
    let root = runtime_root(app)?;
    let source_ready = source.is_some();
    let runtime_ready = root.join(RUNTIME_VERSION_FILE).exists();
    let scripts_ready = scripts_detected(&root);
    let runtime_writable = fs::metadata(&root)
        .map(|metadata| !metadata.permissions().readonly())
        .unwrap_or(false);
    let python_ready = python_candidates(&root)
        .iter()
        .any(|(program, args)| python_allowed(program, args, &root).is_ok());
    let required_exports = [
        "data/app_metadata.json",
        "data/refresh_status.json",
        "data/live/live_heartbeat.json",
        "data/predictions/mlb_predictions.json",
        "data/predictions/wnba_predictions.json",
    ];
    let export_count = required_exports
        .iter()
        .filter(|path| root.join(path).exists())
        .count();
    let exports_ready = export_count == required_exports.len();
    let env_bundled = source
        .map(|path| path.join(".env").exists())
        .unwrap_or(false);
    let release_defaults = PROVIDER_KEY_NAMES
        .iter()
        .filter(|key| bundled_default_key(key).is_some())
        .count();
    let api_keys = api_key_status(&root);
    let configured_keys = [
        api_keys.odds_api_key,
        api_keys.sharp_odds_api_key,
        api_keys.propline_api_key,
    ]
    .into_iter()
    .filter(|configured| *configured)
    .count();
    let checks = vec![
        diagnostic_check(
            "bundled_runtime",
            "Bundled runtime",
            source_ready,
            if source_ready {
                "resource payload found"
            } else {
                "resource payload missing"
            },
        ),
        diagnostic_check(
            "runtime_initialized",
            "Runtime initialized",
            runtime_ready,
            if runtime_ready {
                "per-user runtime is initialized"
            } else {
                "runtime marker is missing"
            },
        ),
        diagnostic_check(
            "refresh_scripts",
            "Refresh scripts",
            scripts_ready,
            if scripts_ready {
                "required refresh scripts are available"
            } else {
                "one or more refresh scripts are missing"
            },
        ),
        diagnostic_check(
            "python",
            "Python runtime",
            python_ready,
            if python_ready {
                "supported Python interpreter detected"
            } else {
                "Python 3.10-3.12 was not detected"
            },
        ),
        diagnostic_check(
            "runtime_writable",
            "Writable local runtime",
            runtime_writable,
            if runtime_writable {
                "refresh output can be written locally"
            } else {
                "local runtime is not writable"
            },
        ),
        diagnostic_check(
            "exports",
            "Bundled exports",
            exports_ready,
            format!(
                "{} of {} core exports are present",
                export_count,
                required_exports.len()
            ),
        ),
        diagnostic_check(
            "secret_bundle",
            "Release secret check",
            !env_bundled,
            if env_bundled {
                "a .env file was found in the bundled resource"
            } else if release_defaults > 0 {
                "release provider defaults are available; no .env file is bundled"
            } else {
                "no .env file is bundled"
            },
        ),
        diagnostic_check(
            "api_keys",
            "API-key status",
            true,
            format!("{} of 3 optional provider keys configured", configured_keys),
        ),
    ];
    let healthy = checks.iter().all(|check| check.status == "ready");
    Ok(RuntimeDiagnostics {
        available: true,
        status: if healthy { "ready" } else { "attention" }.to_string(),
        message: if healthy {
            "The packaged runtime is ready for local refreshes.".to_string()
        } else {
            "One or more runtime checks need attention; cached exports remain available."
                .to_string()
        },
        checks,
        api_keys,
    })
}

#[tauri::command]
async fn get_runtime_diagnostics(app: tauri::AppHandle) -> Result<RuntimeDiagnostics, String> {
    tauri::async_runtime::spawn_blocking(move || collect_runtime_diagnostics(&app))
        .await
        .map_err(|error| format!("Runtime diagnostics failed: {}", error))?
}

fn python_candidates(root: &PathBuf) -> Vec<(String, Vec<String>)> {
    let venv_python = root.join(".venv").join("Scripts").join("python.exe");
    let mut candidates: Vec<(String, Vec<String>)> = Vec::new();
    if venv_python.exists() {
        candidates.push((venv_python.to_string_lossy().to_string(), Vec::new()));
    }
    candidates.push(("py".to_string(), vec!["-3.11".to_string()]));
    candidates.push(("python".to_string(), Vec::new()));
    candidates.push(("py".to_string(), Vec::new()));
    candidates
}

fn command_spec(command_name: &str) -> Result<CommandSpec, String> {
    match command_name {
        "startup_auto" => Ok(CommandSpec {
            script: "scripts/startup_orchestrator.py",
            args: Vec::new(),
        }),
        "bootstrap_env" => Ok(CommandSpec {
            script: "scripts/bootstrap_env.py",
            args: Vec::new(),
        }),
        "startup" => Ok(CommandSpec {
            script: "scripts/startup_orchestrator.py",
            args: Vec::new(),
        }),
        "nfl_real" => Ok(CommandSpec {
            script: "scripts/refresh_data.py",
            args: vec!["--sport", "nfl", "--mode", "real"],
        }),
        "mlb_current" => Ok(CommandSpec {
            script: "scripts/refresh_data.py",
            args: vec!["--sport", "mlb", "--mode", "predict"],
        }),
        "mlb_all" => Ok(CommandSpec {
            script: "scripts/refresh_data.py",
            args: vec!["--sport", "mlb", "--mode", "all"],
        }),
        "mlb_train" => Ok(CommandSpec {
            script: "scripts/refresh_data.py",
            args: vec!["--sport", "mlb", "--mode", "train"],
        }),
        "data_real" => Ok(CommandSpec {
            script: "scripts/refresh_data.py",
            args: vec!["--sport", "all", "--mode", "real"],
        }),
        "check_data" => Ok(CommandSpec {
            script: "scripts/check_data_status.py",
            args: Vec::new(),
        }),
        "score_models" => Ok(CommandSpec {
            script: "scripts/score_model_predictions.py",
            args: Vec::new(),
        }),
        "live_scores" => Ok(CommandSpec {
            script: "scripts/live_scores.py",
            args: Vec::new(),
        }),
        "live_scores_fast" => Ok(CommandSpec {
            script: "scripts/live_scores.py",
            args: vec![
                "--days-back",
                "1",
                "--days-forward",
                "7",
                "--output-stem",
                "live_heartbeat",
            ],
        }),
        "odds_snapshots" => Ok(CommandSpec {
            script: "scripts/odds_snapshots.py",
            args: Vec::new(),
        }),
        "wnba_availability" => Ok(CommandSpec {
            script: "scripts/refresh_wnba_availability.py",
            args: Vec::new(),
        }),
        "mlb_player_games" => Ok(CommandSpec {
            script: "scripts/refresh_mlb_player_games.py",
            args: Vec::new(),
        }),
        "player_props_pipeline" => Ok(CommandSpec {
            script: "scripts/refresh_player_props_pipeline.py",
            args: Vec::new(),
        }),
        "score_props" => Ok(CommandSpec {
            script: "scripts/score_prop_predictions.py",
            args: Vec::new(),
        }),
        "model_update" => Ok(CommandSpec {
            script: "scripts/update_models.py",
            args: Vec::new(),
        }),
        _ => Err(format!("Unsupported refresh command: {}", command_name)),
    }
}

fn shell_command(program: &str, args: &[String]) -> String {
    std::iter::once(program.to_string())
        .chain(args.iter().cloned())
        .map(|part| {
            if part.contains(' ') {
                format!("\"{}\"", part)
            } else {
                part
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn timestamp() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default();
    format!("unix:{}", seconds)
}

fn python_probe(
    program: &str,
    base_args: &[String],
    root: &PathBuf,
) -> Result<(u8, u8, String), String> {
    let mut args = base_args.to_vec();
    args.extend([
        "-c".to_string(),
        "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}|{sys.executable}')"
            .to_string(),
    ]);
    let output = background_command(program)
        .args(args)
        .current_dir(root)
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let mut parts = stdout.split('|');
    let version = parts.next().unwrap_or_default();
    let path = parts.next().unwrap_or_default().to_string();
    let mut nums = version.split('.');
    let major = nums.next().unwrap_or("0").parse::<u8>().unwrap_or(0);
    let minor = nums.next().unwrap_or("0").parse::<u8>().unwrap_or(0);
    Ok((major, minor, path))
}

fn python_allowed(program: &str, args: &[String], root: &PathBuf) -> Result<String, String> {
    let (major, minor, path) = python_probe(program, args, root)?;
    if major == 3 && minor == 11 {
        return Ok(path);
    }
    if major == 3 && (10..=12).contains(&minor) {
        return Ok(path);
    }
    if major == 3 && minor >= 14 {
        return Err("Python 3.14 is too new for nfl-data-py/numpy<2.0. Install Python 3.11 or use py -3.11.".to_string());
    }
    Err(format!(
        "Unsupported Python {}.{}; use Python 3.11.",
        major, minor
    ))
}

fn base_result(
    command_name: &str,
    command: String,
    started_at: String,
    root: &PathBuf,
    scripts_ok: bool,
) -> CommandResult {
    CommandResult {
        command_name: command_name.to_string(),
        command,
        success: false,
        exit_code: None,
        stdout: String::new(),
        stderr: String::new(),
        started_at,
        finished_at: timestamp(),
        duration_ms: 0,
        repo_detected: true,
        python_detected: false,
        venv_detected: root
            .join(".venv")
            .join("Scripts")
            .join("python.exe")
            .exists(),
        scripts_detected: scripts_ok,
    }
}

fn execute_refresh_command(
    app: &tauri::AppHandle,
    command_name: &str,
) -> Result<CommandResult, String> {
    let refresh_lock = REFRESH_PROCESS_LOCK.get_or_init(|| Mutex::new(()));
    let _refresh_guard = refresh_lock.try_lock().map_err(|_| {
        "Another LineLens refresh is already running; cached exports remain available.".to_string()
    })?;
    let root = runtime_root(app)?;
    let scripts_ok = scripts_detected(&root);
    if !scripts_ok {
        return Err("Automatic refresh requires scripts/bootstrap_env.py, scripts/startup_orchestrator.py, scripts/refresh_data.py, scripts/score_model_predictions.py, scripts/live_scores.py, and scripts/odds_snapshots.py.".to_string());
    }
    let spec = command_spec(command_name)?;
    let started_at = timestamp();
    let timer = Instant::now();
    let mut failures = Vec::new();

    for (program, base_args) in python_candidates(&root) {
        match python_allowed(&program, &base_args, &root) {
            Ok(_python_path) => {}
            Err(error) => {
                failures.push(format!(
                    "{} skipped: {}",
                    shell_command(&program, &base_args),
                    error
                ));
                continue;
            }
        }

        let mut args = base_args.clone();
        args.push(spec.script.to_string());
        args.extend(spec.args.iter().map(|arg| arg.to_string()));
        let command_string = shell_command(&program, &args);
        let mut command = background_command(&program);
        command.args(args).current_dir(&root);
        configure_provider_environment(&mut command, &root);
        let output = command.output();
        match output {
            Ok(result) => {
                return Ok(CommandResult {
                    command_name: command_name.to_string(),
                    command: command_string,
                    success: result.status.success(),
                    exit_code: result.status.code(),
                    stdout: String::from_utf8_lossy(&result.stdout).trim().to_string(),
                    stderr: String::from_utf8_lossy(&result.stderr).trim().to_string(),
                    started_at,
                    finished_at: timestamp(),
                    duration_ms: timer.elapsed().as_millis(),
                    repo_detected: true,
                    python_detected: true,
                    venv_detected: root
                        .join(".venv")
                        .join("Scripts")
                        .join("python.exe")
                        .exists(),
                    scripts_detected: scripts_ok,
                });
            }
            Err(error) => failures.push(format!("{} unavailable: {}", program, error)),
        }
    }

    let mut result = base_result(
        command_name,
        command_name.to_string(),
        started_at,
        &root,
        scripts_ok,
    );
    result.finished_at = timestamp();
    result.duration_ms = timer.elapsed().as_millis();
    result.stderr = format!(
        "Automatic refresh failed before command execution. {}",
        failures.join(" | ")
    );
    Ok(result)
}

fn run_refresh_text(app: &tauri::AppHandle, command_name: &str) -> Result<String, String> {
    let result = execute_refresh_command(app, command_name)?;
    if result.success {
        Ok(if result.stdout.is_empty() {
            format!("{} refresh completed.", command_name)
        } else {
            result.stdout
        })
    } else {
        Err(format!(
            "{} failed with exit code {:?}. {}{}",
            result.command_name,
            result.exit_code,
            result.stderr,
            if result.stdout.is_empty() {
                String::new()
            } else {
                format!(" {}", result.stdout)
            }
        ))
    }
}

#[tauri::command]
async fn run_refresh_command(
    app: tauri::AppHandle,
    command_name: String,
) -> Result<CommandResult, String> {
    tauri::async_runtime::spawn_blocking(move || execute_refresh_command(&app, &command_name))
        .await
        .map_err(|error| format!("Refresh task failed: {}", error))?
}

#[tauri::command]
async fn run_startup_automation(app: tauri::AppHandle) -> Result<CommandResult, String> {
    tauri::async_runtime::spawn_blocking(move || execute_refresh_command(&app, "startup_auto"))
        .await
        .map_err(|error| format!("Startup automation task failed: {}", error))?
}

#[tauri::command]
async fn refresh_sports_data(app: tauri::AppHandle, sport: String) -> Result<String, String> {
    let normalized = sport.to_lowercase();
    if !["all", "nfl", "mlb"].contains(&normalized.as_str()) {
        return Err("Unsupported sport refresh request.".to_string());
    }
    let command_name = match normalized.as_str() {
        "all" => "startup_auto",
        "nfl" => "nfl_real",
        "mlb" => "mlb_current",
        _ => "startup_auto",
    }
    .to_string();

    tauri::async_runtime::spawn_blocking(move || run_refresh_text(&app, &command_name))
        .await
        .map_err(|error| format!("Refresh task failed: {}", error))?
}

#[tauri::command]
async fn run_startup_refresh(app: tauri::AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_refresh_text(&app, "startup_auto"))
        .await
        .map_err(|error| format!("Startup refresh task failed: {}", error))?
}

#[tauri::command]
async fn open_live_widget(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("live-widget") {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "live-widget",
        tauri::WebviewUrl::App("widget.html".into()),
    )
    .title("LineLens Live")
    .inner_size(390.0, 170.0)
    .min_inner_size(320.0, 138.0)
    .decorations(false)
    .transparent(true)
    .resizable(true)
    .always_on_top(true)
    .build()
    .map_err(|error| error.to_string())?;

    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
async fn close_live_widget(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("live-widget") {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main LineLens window was not found.".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            sync_shared_data,
            fetch_live_scoreboards,
            run_refresh_command,
            run_startup_automation,
            refresh_sports_data,
            run_startup_refresh,
            read_data_export,
            get_api_key_status,
            save_api_keys,
            get_runtime_diagnostics,
            open_live_widget,
            close_live_widget,
            focus_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running LineLens Sports");
}
