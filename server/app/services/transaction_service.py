from collections.abc import Callable
from typing import TypeVar

from pymongo.errors import ConfigurationError, InvalidOperation, OperationFailure

from app.database import client


T = TypeVar("T")


def run_transaction(operation: Callable[[object | None], T]) -> T:
    """Run a MongoDB transaction, with a safe fallback for standalone dev MongoDB.

    Atlas and replica-set deployments use a real transaction. A standalone
    local MongoDB server cannot start transactions, so the operation falls
    back to its own atomic compare-and-set guards.
    """
    try:
        with client.start_session() as session:
            return session.with_transaction(operation)
    except (ConfigurationError, InvalidOperation):
        return operation(None)
    except OperationFailure as error:
        if error.code == 20:
            return operation(None)
        raise


def session_options(session: object | None) -> dict:
    return {"session": session} if session is not None else {}
