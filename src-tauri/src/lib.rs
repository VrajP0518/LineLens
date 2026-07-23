use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
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

const RUNTIME_VERSION_FILE: &str = ".linelens-runtime-version";
static RUNTIME_SEED_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

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
        || !runtime.join("scripts").join("refresh_data.py").exists();

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
        fs::write(&marker, version).map_err(|error| error.to_string())?;
    }

    if !runtime.join("scripts").join("refresh_data.py").exists() {
        return Err("LineLens runtime files could not be initialized.".to_string());
    }
    Ok(runtime)
}

fn env_key_configured(path: &Path, key: &str) -> bool {
    let contents = match fs::read_to_string(path) {
        Ok(contents) => contents,
        Err(_) => return false,
    };
    contents.lines().any(|line| {
        let trimmed = line.trim_start();
        if trimmed.starts_with('#') {
            return false;
        }
        let Some((name, value)) = trimmed.split_once('=') else {
            return false;
        };
        name.trim() == key
            && !value
                .trim()
                .trim_matches(|character| character == '"' || character == '\'')
                .is_empty()
    })
}

fn api_key_status(root: &Path) -> ApiKeyStatus {
    let env_path = root.join(".env");
    ApiKeyStatus {
        available: true,
        odds_api_key: env_key_configured(&env_path, "ODDS_API_KEY"),
        sharp_odds_api_key: env_key_configured(&env_path, "SHARP_ODDS_API_KEY"),
        propline_api_key: env_key_configured(&env_path, "PROPLINE_API_KEY"),
        message: "Keys are stored locally and are never included in exports.".to_string(),
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
    let output = Command::new(program)
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
        let output = Command::new(&program)
            .args(args)
            .current_dir(&root)
            .output();
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
            run_refresh_command,
            run_startup_automation,
            refresh_sports_data,
            run_startup_refresh,
            read_data_export,
            get_api_key_status,
            save_api_keys,
            open_live_widget,
            close_live_widget,
            focus_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running LineLens Sports");
}
