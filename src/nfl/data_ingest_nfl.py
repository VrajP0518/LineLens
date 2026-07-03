"""Compatibility entrypoint for the existing NFL ingestion CLI.

TODO: Move the root-level NFL implementation here once the legacy scripts no
longer need to remain import-compatible.
"""

from data_ingest import app


if __name__ == "__main__":
    app()
