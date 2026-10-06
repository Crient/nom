"""One offline/acquisition writer at a time for all dish-image tools."""
from contextlib import contextmanager


@contextmanager
def single_run(folder):
    lock = folder / '.fetch.lock'
    try:
        lock.mkdir()
    except FileExistsError:
        raise ValueError(f'Another image operation is running (or interrupted): {lock}. Remove the empty lock only after confirming no image process is running.')
    try:
        yield
    finally:
        lock.rmdir()
