import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database import get_db
from models import Patient
from deps import get_current_user

UPLOAD_DIR = "/app/uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

router = APIRouter(prefix="/uploads", tags=["File Uploads"], dependencies=[Depends(get_current_user)])


class FileInfo(BaseModel):
    name: str
    size: int
    url: str


def _patient_dir(patient_id: int) -> str:
    path = os.path.join(UPLOAD_DIR, str(patient_id))
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/patients/{patient_id}", response_model=FileInfo, status_code=201)
async def upload_file(patient_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: images, PDF, Word documents.")

    dest = os.path.join(_patient_dir(patient_id), file.filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size = os.path.getsize(dest)
    if size > MAX_FILE_SIZE:
        os.remove(dest)
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

    return FileInfo(name=file.filename, size=size, url=f"/uploads/patients/{patient_id}/{file.filename}")


@router.get("/patients/{patient_id}", response_model=List[FileInfo])
def list_files(patient_id: int, db: Session = Depends(get_db)):
    if not db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")

    path = _patient_dir(patient_id)
    files = []
    for name in os.listdir(path):
        full = os.path.join(path, name)
        if os.path.isfile(full):
            files.append(FileInfo(name=name, size=os.path.getsize(full), url=f"/uploads/patients/{patient_id}/{name}"))
    return files


@router.get("/patients/{patient_id}/{filename}")
def download_file(patient_id: int, filename: str, db: Session = Depends(get_db)):
    if not db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")

    path = os.path.join(_patient_dir(patient_id), filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)


@router.delete("/patients/{patient_id}/{filename}", status_code=204)
def delete_file(patient_id: int, filename: str, db: Session = Depends(get_db)):
    if not db.query(Patient).filter(Patient.id == patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")

    path = os.path.join(_patient_dir(patient_id), filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(path)
