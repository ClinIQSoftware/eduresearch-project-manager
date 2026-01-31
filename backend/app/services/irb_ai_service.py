"""IRB AI service for protocol summarization and question pre-filling.

Provides a pluggable LLM provider pattern supporting Anthropic, OpenAI,
and custom HTTP endpoints for AI-assisted IRB workflow features.
"""

import json
import logging
from abc import ABC, abstractmethod
from io import BytesIO
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.irb import (
    IrbAiConfig,
    IrbQuestion,
    IrbSubmission,
    IrbSubmissionResponse,
)
from app.schemas.irb import IrbAiConfigCreate, IrbAiConfigUpdate

logger = logging.getLogger(__name__)


# --- LLM Provider Interface ---

class LlmProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        """Send a completion request and return the response text."""
        ...


class AnthropicProvider(LlmProvider):
    """Anthropic Messages API provider."""

    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name

    async def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "max_tokens": max_tokens,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]


class OpenAIProvider(LlmProvider):
    """OpenAI Chat Completions API provider."""

    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name

    async def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "max_tokens": max_tokens,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]


class CustomProvider(LlmProvider):
    """Generic HTTP endpoint provider for self-hosted models."""

    def __init__(self, api_key: str, endpoint: str, model_name: str):
        self.api_key = api_key
        self.endpoint = endpoint
        self.model_name = model_name

    async def complete(self, system_prompt: str, user_prompt: str, max_tokens: int) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model_name,
                    "max_tokens": max_tokens,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            # Try OpenAI-compatible format first, then raw text
            if "choices" in data:
                return data["choices"][0]["message"]["content"]
            return data.get("text", data.get("content", str(data)))


# --- AI Service ---

class IrbAiService:
    """Service for IRB AI operations: summarization, question pre-fill, config management."""

    SUMMARY_SYSTEM_PROMPT = """You are an expert research ethics reviewer. Summarize the provided research protocol into a clear, structured 1-2 page summary covering:
1. Study Objectives
2. Study Design and Methodology
3. Study Population (inclusion/exclusion criteria)
4. Procedures and Interventions
5. Risks and Risk Mitigation
6. Expected Benefits
7. Data Management and Privacy
8. Informed Consent Process

Be factual and concise. Use professional academic language."""

    PREFILL_SYSTEM_PROMPT = """You are an expert research ethics reviewer. Based on the provided research protocol, answer the following IRB review questions. Return your answers as a JSON object where keys are question IDs (as strings) and values are the answer text.

For multiple-choice questions, return the exact option text. For yes/no questions, return "Yes" or "No". For text questions, provide concise, accurate answers based on the protocol.

Return ONLY valid JSON, no additional text."""

    def __init__(self, db: Session):
        self.db = db

    def _get_config(self, enterprise_id: UUID) -> IrbAiConfig:
        """Get AI config for enterprise or raise NotFoundException."""
        config = (
            self.db.query(IrbAiConfig)
            .filter(IrbAiConfig.enterprise_id == enterprise_id)
            .first()
        )
        if not config:
            raise NotFoundException("AI configuration not found for this enterprise")
        if not config.is_active:
            raise BadRequestException("AI configuration is disabled")
        return config

    def _get_provider(self, config: IrbAiConfig) -> LlmProvider:
        """Instantiate the correct LLM provider from config."""
        # Decrypt API key (for now, stored as-is; encryption can be added later)
        api_key = config.api_key_encrypted

        if config.provider == "anthropic":
            return AnthropicProvider(api_key=api_key, model_name=config.model_name)
        elif config.provider == "openai":
            return OpenAIProvider(api_key=api_key, model_name=config.model_name)
        elif config.provider == "custom":
            if not config.custom_endpoint:
                raise BadRequestException("Custom provider requires an endpoint URL")
            return CustomProvider(
                api_key=api_key,
                endpoint=config.custom_endpoint,
                model_name=config.model_name,
            )
        else:
            raise BadRequestException(f"Unknown AI provider: {config.provider}")

    @staticmethod
    def _parse_pdf(file_bytes: bytes) -> str:
        """Extract text from PDF bytes using PyPDF2."""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error("Failed to parse PDF: %s", e)
            raise BadRequestException(f"Failed to parse PDF file: {e}")

    @staticmethod
    def _parse_docx(file_bytes: bytes) -> str:
        """Extract text from DOCX bytes using python-docx."""
        try:
            from docx import Document
            doc = Document(BytesIO(file_bytes))
            return "\n\n".join(
                paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()
            )
        except Exception as e:
            logger.error("Failed to parse DOCX: %s", e)
            raise BadRequestException(f"Failed to parse DOCX file: {e}")

    async def _download_and_parse(self, file_url: str) -> str:
        """Download a file and extract text based on extension."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(file_url)
            response.raise_for_status()

        file_bytes = response.content
        lower_url = file_url.lower()

        if lower_url.endswith(".pdf"):
            return self._parse_pdf(file_bytes)
        elif lower_url.endswith(".docx"):
            return self._parse_docx(file_bytes)
        else:
            raise BadRequestException(
                "Unsupported file format. Only PDF and DOCX are supported."
            )

    async def summarize_protocol(self, submission_id: UUID, enterprise_id: UUID) -> str:
        """Generate AI summary of submission protocol and store it."""
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException("Submission not found")
        if not submission.protocol_file_url:
            raise BadRequestException("No protocol file uploaded")

        config = self._get_config(enterprise_id)
        provider = self._get_provider(config)

        protocol_text = await self._download_and_parse(submission.protocol_file_url)

        # Truncate if too long (leave room for system prompt)
        max_input_chars = 100000
        if len(protocol_text) > max_input_chars:
            protocol_text = protocol_text[:max_input_chars] + "\n\n[Text truncated due to length]"

        summary = await provider.complete(
            system_prompt=self.SUMMARY_SYSTEM_PROMPT,
            user_prompt=f"Please summarize the following research protocol:\n\n{protocol_text}",
            max_tokens=config.max_tokens,
        )

        submission.ai_summary = summary
        submission.ai_summary_approved = False
        self.db.commit()

        return summary

    async def prefill_questions(
        self, submission_id: UUID, enterprise_id: UUID
    ) -> list[IrbSubmissionResponse]:
        """Pre-fill submission questions using AI based on protocol text."""
        submission = (
            self.db.query(IrbSubmission)
            .filter(IrbSubmission.id == submission_id)
            .first()
        )
        if not submission:
            raise NotFoundException("Submission not found")
        if not submission.protocol_file_url:
            raise BadRequestException("No protocol file uploaded")

        config = self._get_config(enterprise_id)
        provider = self._get_provider(config)

        protocol_text = await self._download_and_parse(submission.protocol_file_url)
        max_input_chars = 100000
        if len(protocol_text) > max_input_chars:
            protocol_text = protocol_text[:max_input_chars]

        # Get active questions for this board and submission type
        questions = (
            self.db.query(IrbQuestion)
            .filter(
                IrbQuestion.board_id == submission.board_id,
                IrbQuestion.is_active == True,
                IrbQuestion.submission_type.in_([submission.submission_type, "both"]),
            )
            .all()
        )

        if not questions:
            return []

        # Build question list for the prompt
        questions_text = "\n".join(
            f"Question ID {q.id}: [{q.question_type}] {q.text}"
            + (f" (Options: {json.dumps(q.options)})" if q.options else "")
            for q in questions
        )

        user_prompt = (
            f"Research Protocol:\n{protocol_text}\n\n"
            f"Questions to answer:\n{questions_text}"
        )

        raw_response = await provider.complete(
            system_prompt=self.PREFILL_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            max_tokens=config.max_tokens,
        )

        # Parse JSON response
        try:
            # Try to extract JSON from the response (may have markdown code fences)
            clean = raw_response.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1]  # Remove first line
                clean = clean.rsplit("```", 1)[0]  # Remove last fence
            answers = json.loads(clean)
        except (json.JSONDecodeError, IndexError):
            logger.warning("AI returned non-JSON response for prefill: %s", raw_response[:200])
            return []

        # Create/update submission response records
        created_responses = []
        for question in questions:
            answer_text = answers.get(str(question.id))
            if answer_text is None:
                continue

            existing = (
                self.db.query(IrbSubmissionResponse)
                .filter(
                    IrbSubmissionResponse.submission_id == submission_id,
                    IrbSubmissionResponse.question_id == question.id,
                )
                .first()
            )
            if existing:
                existing.answer = str(answer_text)
                existing.ai_prefilled = True
                existing.user_confirmed = False
                created_responses.append(existing)
            else:
                response = IrbSubmissionResponse(
                    submission_id=submission_id,
                    question_id=question.id,
                    enterprise_id=enterprise_id,
                    answer=str(answer_text),
                    ai_prefilled=True,
                    user_confirmed=False,
                )
                self.db.add(response)
                created_responses.append(response)

        self.db.commit()

        return created_responses

    # --- AI Config CRUD ---

    def get_config(self, enterprise_id: UUID) -> Optional[IrbAiConfig]:
        """Get AI config for enterprise (returns None if not configured)."""
        return (
            self.db.query(IrbAiConfig)
            .filter(IrbAiConfig.enterprise_id == enterprise_id)
            .first()
        )

    def save_config(self, enterprise_id: UUID, data: IrbAiConfigCreate) -> IrbAiConfig:
        """Create or update AI config for enterprise."""
        existing = self.get_config(enterprise_id)

        if existing:
            existing.provider = data.provider
            existing.api_key_encrypted = data.api_key  # TODO: encrypt
            existing.model_name = data.model_name
            existing.custom_endpoint = data.custom_endpoint
            existing.max_tokens = data.max_tokens
            existing.is_active = True
            self.db.commit()
            return existing
        else:
            config = IrbAiConfig(
                enterprise_id=enterprise_id,
                provider=data.provider,
                api_key_encrypted=data.api_key,  # TODO: encrypt
                model_name=data.model_name,
                custom_endpoint=data.custom_endpoint,
                max_tokens=data.max_tokens,
                is_active=True,
            )
            self.db.add(config)
            self.db.commit()
            return config

    def update_config(self, enterprise_id: UUID, data: IrbAiConfigUpdate) -> IrbAiConfig:
        """Update AI config fields."""
        config = self._get_config(enterprise_id)
        update_data = data.model_dump(exclude_unset=True)

        if "api_key" in update_data:
            config.api_key_encrypted = update_data.pop("api_key")  # TODO: encrypt

        for key, value in update_data.items():
            setattr(config, key, value)

        self.db.commit()
        return config

    async def test_connection(self, enterprise_id: UUID) -> dict:
        """Test AI connection by sending a minimal prompt."""
        config = self._get_config(enterprise_id)
        provider = self._get_provider(config)

        try:
            result = await provider.complete(
                system_prompt="You are a helpful assistant.",
                user_prompt="Respond with exactly: CONNECTION_OK",
                max_tokens=20,
            )
            return {"status": "success", "response": result.strip()}
        except Exception as e:
            return {"status": "error", "error": str(e)}
