"""S3-compatible object storage client for EduResearch Project Manager.

Provides upload, download, delete, and presigned URL generation
for S3-compatible storage (Render Object Storage, AWS S3, Cloudflare R2, etc.).
Falls back to local filesystem when S3 is not configured.
"""

import logging
from io import BytesIO
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    """Get or create a singleton S3 client."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            region_name=settings.s3_region,
            config=BotoConfig(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
            ),
        )
    return _s3_client


def upload_to_s3(
    object_key: str,
    data: bytes,
    content_type: Optional[str] = None,
) -> None:
    """Upload bytes to S3.

    Args:
        object_key: The S3 object key (path within the bucket).
        data: File content as bytes.
        content_type: MIME type of the file.
    """
    client = get_s3_client()
    extra_args = {}
    if content_type:
        extra_args["ContentType"] = content_type

    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
        Body=data,
        **extra_args,
    )


def download_from_s3(object_key: str) -> bytes:
    """Download an object from S3.

    Args:
        object_key: The S3 object key.

    Returns:
        File content as bytes.

    Raises:
        ClientError: If the object does not exist.
    """
    client = get_s3_client()
    response = client.get_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
    )
    return response["Body"].read()


def delete_from_s3(object_key: str) -> None:
    """Delete an object from S3.

    Args:
        object_key: The S3 object key.
    """
    client = get_s3_client()
    client.delete_object(
        Bucket=settings.s3_bucket_name,
        Key=object_key,
    )


def generate_presigned_url(
    object_key: str,
    filename: str,
    content_type: Optional[str] = None,
    expiry: Optional[int] = None,
) -> str:
    """Generate a presigned download URL for an S3 object.

    Args:
        object_key: The S3 object key.
        filename: Original filename for Content-Disposition header.
        content_type: MIME type for the response.
        expiry: URL expiry in seconds (defaults to settings.s3_presigned_url_expiry).

    Returns:
        A presigned URL string.
    """
    client = get_s3_client()
    params = {
        "Bucket": settings.s3_bucket_name,
        "Key": object_key,
        "ResponseContentDisposition": f'attachment; filename="{filename}"',
    }
    if content_type:
        params["ResponseContentType"] = content_type

    return client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expiry or settings.s3_presigned_url_expiry,
    )


def s3_object_exists(object_key: str) -> bool:
    """Check if an object exists in S3.

    Args:
        object_key: The S3 object key.

    Returns:
        True if the object exists.
    """
    client = get_s3_client()
    try:
        client.head_object(
            Bucket=settings.s3_bucket_name,
            Key=object_key,
        )
        return True
    except ClientError:
        return False
