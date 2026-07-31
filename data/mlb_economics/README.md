# MLB Economics input

Put a real team-season payroll file in `payroll.csv` using the header already
provided. Values are never estimated by the builder. A local Lahman-compatible
`Salaries.csv` is also supported when placed beside this file or under
`data/raw/mlb/lahman/`; `Teams.csv` can supply historical results.

Rebuild with:

```powershell
python scripts/build_mlb_economics.py
```
