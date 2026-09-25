from pydantic import BaseModel
from typing import Optional


class CharityCreate(BaseModel):
    organization_name: str
    description: Optional[str] = None
    phone: str
    address: str
    area: str
    verification_document_url: Optional[str] = None

from pydantic import BaseModel
from typing import Optional


class CharityCreate(BaseModel):
    organization_name: str
    description: Optional[str] = None
    phone: str
    address: str
    area: str
    verification_document_url: Optional[str] = None


class CharityUpdate(BaseModel):
    organization_name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    verification_document_url: Optional[str] = None

