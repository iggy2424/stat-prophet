"""Errors shared by sync jobs."""


class PartialSync(RuntimeError):
    """A job saved some rows but left others pending. run_job logs it as failed with the row count."""

    def __init__(self, message: str, rows_written: int):
        super().__init__(message)
        self.rows_written = rows_written
