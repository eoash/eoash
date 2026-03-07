"""
Gmail API Client for EO Studio
Handles email retrieval and management via Gmail API
"""

import os
import base64
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

import google.auth
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Gmail API scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


class GmailClient:
    """Gmail API client for reading and searching emails"""

    def __init__(self, service: Optional[Any] = None):
        """
        Initialize Gmail client.

        Args:
            service: 주입된 Gmail API service 객체 (테스트용 mock 주입 시 사용)
                     None이면 최초 API 호출 시점에 ADC 인증 실행
        """
        self._service = service

    @property
    def service(self) -> Any:
        """Gmail API service — 최초 접근 시 ADC 인증 실행 (lazy initialization)."""
        if self._service is None:
            self._authenticate()
        return self._service

    @classmethod
    def create_with_mock(cls, mock_service: Any) -> "GmailClient":
        """테스트용 팩토리 — mock service를 주입한 인스턴스 반환."""
        return cls(service=mock_service)

    def _authenticate(self):
        """Authenticate with Gmail API using Application Default Credentials."""
        creds, _ = google.auth.default(scopes=SCOPES)
        creds.refresh(Request())
        self._service = build('gmail', 'v1', credentials=creds)
        logger.info("Gmail API service initialized via ADC")

    def list_messages(self, query: str = '', max_results: int = 10,
                     user_id: str = 'me') -> List[Dict]:
        """
        List messages matching query

        Args:
            query: Gmail search query (e.g., 'from:example@gmail.com')
            max_results: Maximum number of messages to return
            user_id: User's email (default 'me' for authenticated user)

        Returns:
            List of message dictionaries with id and threadId
        """
        try:
            results = self.service.users().messages().list(
                userId=user_id,
                q=query,
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])
            logger.info(f"Found {len(messages)} messages matching query: '{query}'")
            return messages

        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            raise

    def get_message(self, message_id: str, user_id: str = 'me') -> Dict:
        """
        Get full message details

        Args:
            message_id: Message ID
            user_id: User's email (default 'me')

        Returns:
            Full message dictionary with headers and body
        """
        try:
            message = self.service.users().messages().get(
                userId=user_id,
                id=message_id,
                format='full'
            ).execute()

            return message

        except HttpError as error:
            logger.error(f"Failed to get message {message_id}: {error}")
            raise

    def parse_message(self, message: Dict) -> Dict:
        """
        Parse message into readable format

        Args:
            message: Raw message from Gmail API

        Returns:
            Parsed message with subject, from, to, date, body
        """
        headers = message['payload']['headers']

        # Extract headers
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        from_email = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
        to_email = next((h['value'] for h in headers if h['name'] == 'To'), 'Unknown')
        date_str = next((h['value'] for h in headers if h['name'] == 'Date'), '')

        # Extract body
        body = self._get_message_body(message['payload'])

        # Parse internal date (milliseconds since epoch)
        internal_date = int(message['internalDate']) / 1000
        date = datetime.fromtimestamp(internal_date)

        return {
            'id': message['id'],
            'thread_id': message['threadId'],
            'subject': subject,
            'from': from_email,
            'to': to_email,
            'date': date,
            'date_str': date_str,
            'body': body,
            'snippet': message.get('snippet', ''),
            'labels': message.get('labelIds', [])
        }

    def _get_message_body(self, payload: Dict) -> str:
        """
        Extract message body from payload

        Args:
            payload: Message payload

        Returns:
            Decoded message body (plain text or HTML)
        """
        if 'body' in payload and 'data' in payload['body']:
            return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')

        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    if 'data' in part['body']:
                        return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')

                # Recursively search in nested parts
                if 'parts' in part:
                    body = self._get_message_body(part)
                    if body:
                        return body

        return ''

    def search_messages(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Search and parse messages

        Args:
            query: Gmail search query
            max_results: Maximum messages to return

        Returns:
            List of parsed message dictionaries
        """
        messages = self.list_messages(query=query, max_results=max_results)

        parsed_messages = []
        for msg in messages:
            try:
                full_message = self.get_message(msg['id'])
                parsed = self.parse_message(full_message)
                parsed_messages.append(parsed)
            except HttpError as e:
                logger.error(f"Gmail API 오류 (message {msg['id']}): {e}")
            except (KeyError, ValueError) as e:
                logger.warning(f"메시지 파싱 실패 (message {msg['id']}): {e}")

        return parsed_messages

    def get_recent_messages(self, days: int = 7, max_results: int = 50) -> List[Dict]:
        """
        Get recent messages from last N days

        Args:
            days: Number of days to look back
            max_results: Maximum messages to return

        Returns:
            List of parsed messages
        """
        # Calculate date for Gmail query
        from_date = datetime.now() - timedelta(days=days)
        date_str = from_date.strftime('%Y/%m/%d')

        query = f'after:{date_str}'
        return self.search_messages(query=query, max_results=max_results)

    def search_by_sender(self, sender: str, max_results: int = 10) -> List[Dict]:
        """
        Search messages from specific sender

        Args:
            sender: Email address or name
            max_results: Maximum messages to return

        Returns:
            List of parsed messages
        """
        query = f'from:{sender}'
        return self.search_messages(query=query, max_results=max_results)

    def search_by_subject(self, subject: str, max_results: int = 10) -> List[Dict]:
        """
        Search messages by subject

        Args:
            subject: Subject keywords
            max_results: Maximum messages to return

        Returns:
            List of parsed messages
        """
        query = f'subject:{subject}'
        return self.search_messages(query=query, max_results=max_results)

    def get_unread_messages(self, max_results: int = 20) -> List[Dict]:
        """
        Get unread messages

        Args:
            max_results: Maximum messages to return

        Returns:
            List of parsed unread messages
        """
        query = 'is:unread'
        return self.search_messages(query=query, max_results=max_results)


if __name__ == '__main__':
    # Test Gmail client
    logging.basicConfig(level=logging.INFO)

    client = GmailClient()
    print("\n✅ Gmail client initialized successfully!")

    # Get recent messages
    print("\n📧 Fetching recent messages...")
    recent = client.get_recent_messages(days=7, max_results=5)

    for msg in recent:
        print(f"\n---")
        print(f"From: {msg['from']}")
        print(f"Subject: {msg['subject']}")
        print(f"Date: {msg['date']}")
        print(f"Snippet: {msg['snippet'][:100]}...")
