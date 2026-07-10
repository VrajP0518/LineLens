# LineLens Model Evaluation

## Selection rule

MLB candidates are evaluated on the same sealed chronological test season. Production selection is evidence-led:

1. lowest holdout log loss;
2. lowest Brier score as the tie-breaker;
3. retain the existing production artifact if the challenger does not win.

Accuracy, ROC AUC, calibration error, chronological stability, sample size, and baseline comparisons remain visible even when they do not determine selection.

## Moltres

Moltres combines the strongest base estimators that train successfully with a logistic meta-model trained on chronological out-of-fold probabilities. Its test season is excluded from both base-model and meta-model fitting.

The model card records:

- base components and blend weights;
- train and test seasons;
- out-of-fold row and fold counts;
- leakage controls;
- holdout metrics;
- component contribution output;
- selection evidence and limitations.

Moltres can be evaluated without being selected. The application uses `Moltres pending`, `Moltres challenger`, or `Moltres active` from real artifacts and registry state; it does not infer status from the model name.

## Responsible interpretation

LineLens is an experimental analytics project, not betting advice. A model edge is not a guaranteed outcome, and an odds-linked row is not evidence that the model beats a market. The app preserves missing odds, proxy pitcher data, stale feeds, small samples, and pending results as limitations.

## Reproduction

The exact manual commands are maintained in the README under “Manual Moltres training and evaluation commands.” Training is intentionally not part of the bundled demo path.
