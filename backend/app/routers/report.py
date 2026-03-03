from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.analyzer import parse_excel, compute_analytics

router = APIRouter(prefix="/api")

_current_report: dict | None = None


@router.post("/upload")
async def upload_report(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx files accepted")

    contents = await file.read()
    try:
        parsed = parse_excel(contents)
        result = compute_analytics(parsed)
        result["metadata"]["filename"] = file.filename
    except Exception as e:
        raise HTTPException(422, f"Failed to parse file: {str(e)}")

    global _current_report
    _current_report = result
    return result


@router.get("/report")
async def get_report():
    if _current_report is None:
        raise HTTPException(404, "No report uploaded yet")
    return _current_report
