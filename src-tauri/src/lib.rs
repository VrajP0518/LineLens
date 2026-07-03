use std::path::PathBuf;
use std::process::Command;

fn project_root() -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let root = manifest_dir
        .parent()
        .ok_or_else(|| "Unable to resolve project root.".to_string())?
        .to_path_buf();

    if root.join("scripts").join("refresh_data.py").exists() {
        Ok(root)
    } else {
        Err("Automatic refresh requires Python project files. Showing bundled data.".to_string())
    }
}

fn python_candidates(root: &PathBuf) -> Vec<(String, Vec<String>)> {
    let venv_python = root.join(".venv").join("Scripts").join("python.exe");
    let mut candidates: Vec<(String, Vec<String>)> = Vec::new();
    if venv_python.exists() {
        candidates.push((venv_python.to_string_lossy().to_string(), Vec::new()));
    }
    candidates.push(("python".to_string(), Vec::new()));
    candidates.push(("py".to_string(), vec!["-3.11".to_string()]));
    candidates.push(("py".to_string(), Vec::new()));
    candidates
}

fn run_refresh_command(sport: &str, mode: &str) -> Result<String, String> {
    let root = project_root()?;
    let mut failures = Vec::new();
    for (program, mut args) in python_candidates(&root) {
        args.extend([
            "scripts/refresh_data.py".to_string(),
            "--sport".to_string(),
            sport.to_string(),
            "--mode".to_string(),
            mode.to_string(),
        ]);
        let output = Command::new(&program).args(args).current_dir(&root).output();
        match output {
            Ok(result) if result.status.success() => {
                let stdout = String::from_utf8_lossy(&result.stdout).trim().to_string();
                return Ok(if stdout.is_empty() {
                    format!("{} refresh completed.", sport)
                } else {
                    stdout
                });
            }
            Ok(result) => {
                let stderr = String::from_utf8_lossy(&result.stderr).trim().to_string();
                let stdout = String::from_utf8_lossy(&result.stdout).trim().to_string();
                failures.push(format!(
                    "{} failed: {}{}",
                    program,
                    stderr,
                    if stdout.is_empty() { String::new() } else { format!(" {}", stdout) }
                ));
            }
            Err(error) => failures.push(format!("{} unavailable: {}", program, error)),
        }
    }

    Err(format!(
        "Automatic refresh failed. Showing cached data. {}",
        failures.join(" | ")
    ))
}

#[tauri::command]
async fn refresh_sports_data(sport: String) -> Result<String, String> {
    let normalized = sport.to_lowercase();
    if !["all", "nfl", "mlb"].contains(&normalized.as_str()) {
        return Err("Unsupported sport refresh request.".to_string());
    }
    let mode = match normalized.as_str() {
        "all" => "startup",
        "nfl" => "real",
        "mlb" => "predict",
        _ => "current",
    };

    tauri::async_runtime::spawn_blocking(move || run_refresh_command(&normalized, mode))
        .await
        .map_err(|error| format!("Refresh task failed: {}", error))?
}

#[tauri::command]
async fn run_startup_refresh() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_refresh_command("all", "startup"))
        .await
        .map_err(|error| format!("Startup refresh task failed: {}", error))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![refresh_sports_data, run_startup_refresh])
        .run(tauri::generate_context!())
        .expect("error while running LineLens Sports");
}
