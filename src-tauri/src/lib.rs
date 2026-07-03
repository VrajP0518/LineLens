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

fn run_refresh_command(sport: &str) -> Result<String, String> {
    let root = project_root()?;
    let candidates: Vec<(&str, Vec<&str>)> = vec![
        ("python", vec!["scripts/refresh_data.py", "--sport", sport]),
        ("py", vec!["-3.11", "scripts/refresh_data.py", "--sport", sport]),
        ("py", vec!["scripts/refresh_data.py", "--sport", sport]),
    ];

    let mut failures = Vec::new();
    for (program, args) in candidates {
        let output = Command::new(program).args(args).current_dir(&root).output();
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

    tauri::async_runtime::spawn_blocking(move || run_refresh_command(&normalized))
        .await
        .map_err(|error| format!("Refresh task failed: {}", error))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![refresh_sports_data])
        .run(tauri::generate_context!())
        .expect("error while running LineLens Sports");
}
