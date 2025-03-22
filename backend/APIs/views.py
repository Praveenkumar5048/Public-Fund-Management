from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .utils import process_document
from django.core.files.uploadedfile import UploadedFile
import json

class DocumentAnalysisView(APIView):
    """
    API endpoint for analyzing government funding documents.
    """
    
    def post(self, request, *args, **kwargs):
        # Check if file is in request
        if 'file' not in request.FILES:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get file from request
        file = request.FILES['file']
        
        # Get custom questions if provided
        custom_questions = None
        if 'custom_questions' in request.data:
            try:
                custom_questions = json.loads(request.data['custom_questions'])
            except json.JSONDecodeError:
                return Response(
                    {"error": "Invalid format for custom_questions"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            # Process document
            result = process_document(file, custom_questions)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )