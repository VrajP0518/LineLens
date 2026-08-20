# LineLens v6 model delivery

LineLens separates model review from model publication.

1. **Retrain Models** runs weekly or manually. It preserves the prior selected-model registry, retrains chronologically, writes `data/reports/model_drift_alerts.*`, validates the app, builds a review bundle, and creates a GitHub artifact attestation. It opens a pull request when repository policy permits. If PR creation is disabled or fails, the run remains reviewable through its signed artifact, `manual-review.txt`, and `retraining-review.patch`; no candidate is promoted.
2. A maintainer reviews the holdout metrics, calibration, drift report, changed predictions, and signed provenance before merging.
3. **Publish Approved Model Channel** is started manually on `main` with `APPROVE`. It builds a deterministic bundle and manifest, signs both with GitHub artifact provenance, and updates the `model-channel-v6` prerelease assets.
4. An installed client uses **Settings → Check for approved model update**. The updater accepts only the repository’s HTTPS v6 channel URL, validates the archive SHA-256, validates every file hash and size, rejects unexpected or traversing paths, backs up replaced artifacts, then installs the staged files.

The updater does not execute downloaded code and does not accept Python scripts, executables, environment files, or arbitrary destinations. Application code changes still require a normal LineLens release.

To publish an approved model:

- Merge the reviewed retraining PR.
- If no PR was created, download the signed retraining artifact, review the same evidence, apply `retraining-review.patch` on a maintainer branch, and open a normal PR.
- Open **Actions → Publish Approved Model Channel → Run workflow** on `main`.
- Enter `APPROVE`.
- Open the workflow’s attestation link and verify the subjects before announcing the model version.

For local testing only, `LINELENS_MODEL_MANIFEST_URL` or `--manifest-url` can select a different manifest. The bundle itself must still point to the approved repository release channel.
