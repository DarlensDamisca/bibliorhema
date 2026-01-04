#!/usr/bin/env python3
"""
Backend API Testing for Immersive Library Application
Tests all backend endpoints as specified in the review request
"""

import requests
import json
import os
import tempfile
from io import BytesIO

# Get base URL from environment
BASE_URL = "https://immersive-shelf.preview.emergentagent.com/api"

def test_books_api_pagination():
    """Test Books API with pagination functionality"""
    print("\n=== Testing Books API with Pagination ===")
    
    try:
        # Test 1: GET /api/books?page=1&limit=12
        print("1. Testing GET /api/books?page=1&limit=12")
        response = requests.get(f"{BASE_URL}/books?page=1&limit=12")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            books = data.get('books', [])
            pagination = data.get('pagination', {})
            
            print(f"✅ Books returned: {len(books)}")
            print(f"✅ Pagination info: page={pagination.get('page')}, limit={pagination.get('limit')}, total={pagination.get('total')}")
            
            if len(books) <= 12:
                print("✅ Pagination limit respected")
            else:
                print("❌ Too many books returned")
                return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 2: GET /api/books?page=2&limit=3
        print("\n2. Testing GET /api/books?page=2&limit=3")
        response = requests.get(f"{BASE_URL}/books?page=2&limit=3")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            books = data.get('books', [])
            pagination = data.get('pagination', {})
            
            print(f"✅ Books returned: {len(books)}")
            print(f"✅ Page 2 with limit 3: page={pagination.get('page')}, limit={pagination.get('limit')}")
            
            if len(books) <= 3:
                print("✅ Page 2 pagination working correctly")
            else:
                print("❌ Too many books returned for page 2")
                return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 3: GET /api/books?category=Fiction
        print("\n3. Testing GET /api/books?category=Fiction")
        response = requests.get(f"{BASE_URL}/books?category=Fiction")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            books = data.get('books', [])
            print(f"✅ Fiction books found: {len(books)}")
            
            # Check if all books are Fiction category
            fiction_books = [book for book in books if book.get('category') == 'Fiction']
            if len(fiction_books) == len(books):
                print("✅ Category filtering working correctly")
            else:
                print("❌ Category filtering not working properly")
                return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 4: GET /api/books?search=Harry
        print("\n4. Testing GET /api/books?search=Harry")
        response = requests.get(f"{BASE_URL}/books?search=Harry")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            books = data.get('books', [])
            print(f"✅ Search results for 'Harry': {len(books)} books found")
            
            # Check if search results contain 'Harry' in title or author
            for book in books:
                title = book.get('title', '').lower()
                author = book.get('author', '').lower()
                if 'harry' in title or 'harry' in author:
                    print(f"✅ Found relevant book: {book.get('title')} by {book.get('author')}")
                    break
            else:
                if len(books) == 0:
                    print("✅ No books found with 'Harry' - search working correctly")
                else:
                    print("❌ Search results don't contain 'Harry'")
                    return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
            
        print("✅ Books API pagination tests completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Books API pagination test failed: {str(e)}")
        return False

def test_upload_api():
    """Test Upload API for different file types"""
    print("\n=== Testing Upload API ===")
    
    try:
        # Test 1: POST /api/upload with image file (type='cover')
        print("1. Testing POST /api/upload with image file (type='cover')")
        
        # Create a small test image file
        image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_cover.png', image_content, 'image/png')}
        data = {'type': 'cover'}
        
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            url = result.get('url')
            filename = result.get('filename')
            print(f"✅ Image uploaded successfully: {url}")
            print(f"✅ Filename: {filename}")
            
            if '/uploads/covers/' in url:
                print("✅ Image saved in correct directory")
            else:
                print("❌ Image not saved in covers directory")
                return False
        else:
            print(f"❌ Image upload failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 2: POST /api/upload with PDF file (type='book')
        print("\n2. Testing POST /api/upload with PDF file (type='book')")
        
        # Create a minimal PDF content
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF'
        
        files = {'file': ('test_book.pdf', pdf_content, 'application/pdf')}
        data = {'type': 'book'}
        
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            url = result.get('url')
            filename = result.get('filename')
            print(f"✅ PDF uploaded successfully: {url}")
            print(f"✅ Filename: {filename}")
            
            if '/uploads/books/' in url:
                print("✅ PDF saved in correct directory")
            else:
                print("❌ PDF not saved in books directory")
                return False
        else:
            print(f"❌ PDF upload failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 3: POST /api/upload with audio file (type='audio')
        print("\n3. Testing POST /api/upload with audio file (type='audio')")
        
        # Create a minimal MP3 header
        mp3_content = b'\xff\xfb\x90\x00' + b'\x00' * 100  # Basic MP3 header + some data
        
        files = {'file': ('test_audio.mp3', mp3_content, 'audio/mpeg')}
        data = {'type': 'audio'}
        
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            url = result.get('url')
            filename = result.get('filename')
            print(f"✅ Audio uploaded successfully: {url}")
            print(f"✅ Filename: {filename}")
            
            if '/uploads/audio/' in url:
                print("✅ Audio saved in correct directory")
            else:
                print("❌ Audio not saved in audio directory")
                return False
        else:
            print(f"❌ Audio upload failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 4: Test invalid file type
        print("\n4. Testing invalid file type upload")
        
        files = {'file': ('test.txt', b'test content', 'text/plain')}
        data = {'type': 'cover'}
        
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Invalid file type correctly rejected")
        else:
            print(f"❌ Invalid file type should be rejected but got status {response.status_code}")
            return False
            
        print("✅ Upload API tests completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Upload API test failed: {str(e)}")
        return False

def test_chat_ai_api():
    """Test Chat AI API"""
    print("\n=== Testing Chat AI API ===")
    
    try:
        # Test 1: POST /api/chat with simple message
        print("1. Testing POST /api/chat with simple message")
        
        payload = {
            "messages": [
                {"role": "user", "content": "Bonjour, pouvez-vous me recommander un livre?"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload, stream=True)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Chat AI API responding")
            
            # Check if it's a streaming response
            content_type = response.headers.get('content-type', '')
            if 'text/event-stream' in content_type:
                print("✅ Streaming response detected")
                
                # Read first few chunks to verify streaming works
                chunk_count = 0
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        chunk_count += 1
                        if chunk_count >= 3:  # Read first 3 chunks
                            break
                
                if chunk_count > 0:
                    print(f"✅ Received {chunk_count} streaming chunks")
                else:
                    print("❌ No streaming content received")
                    return False
            else:
                print("❌ Expected streaming response but got different content type")
                return False
        else:
            print(f"❌ Chat AI failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 2: POST /api/chat with empty messages
        print("\n2. Testing POST /api/chat with empty messages")
        
        payload = {"messages": []}
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Empty messages correctly rejected")
        else:
            print(f"❌ Empty messages should be rejected but got status {response.status_code}")
            return False
            
        print("✅ Chat AI API tests completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Chat AI API test failed: {str(e)}")
        return False

def test_admin_api():
    """Test Admin API"""
    print("\n=== Testing Admin API ===")
    
    try:
        # Test 1: POST /api/admin/login with correct credentials
        print("1. Testing POST /api/admin/login with correct credentials")
        
        payload = {
            "email": "admin@library.com",
            "password": "admin123"
        }
        
        response = requests.post(f"{BASE_URL}/admin/login", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success')
            user = result.get('user', {})
            
            print(f"✅ Admin login successful: {success}")
            print(f"✅ User info: {user.get('email')} - {user.get('role')}")
            
            if success and user.get('role') == 'admin':
                print("✅ Admin authentication working correctly")
            else:
                print("❌ Admin authentication response invalid")
                return False
        else:
            print(f"❌ Admin login failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 2: POST /api/admin/login with incorrect credentials
        print("\n2. Testing POST /api/admin/login with incorrect credentials")
        
        payload = {
            "email": "admin@library.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/admin/login", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 401:
            print("✅ Invalid credentials correctly rejected")
        else:
            print(f"❌ Invalid credentials should be rejected but got status {response.status_code}")
            return False
            
        # Test 3: GET /api/admin/stats
        print("\n3. Testing GET /api/admin/stats")
        
        response = requests.get(f"{BASE_URL}/admin/stats")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            stats = result.get('stats', {})
            
            total_books = stats.get('totalBooks')
            total_categories = stats.get('totalCategories')
            total_authors = stats.get('totalAuthors')
            
            print(f"✅ Stats retrieved successfully:")
            print(f"   - Total Books: {total_books}")
            print(f"   - Total Categories: {total_categories}")
            print(f"   - Total Authors: {total_authors}")
            
            if isinstance(total_books, int) and total_books >= 0:
                print("✅ Admin stats working correctly")
            else:
                print("❌ Admin stats format invalid")
                return False
        else:
            print(f"❌ Admin stats failed with status {response.status_code}: {response.text}")
            return False
            
        print("✅ Admin API tests completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Admin API test failed: {str(e)}")
        return False

def test_books_crud():
    """Test CRUD operations for books"""
    print("\n=== Testing Books CRUD Operations ===")
    
    created_book_id = None
    
    try:
        # Test 1: POST /api/books - Create a new book
        print("1. Testing POST /api/books - Create new book")
        
        new_book = {
            "title": "Test Book for API Testing",
            "author": "Test Author",
            "category": "Test Category",
            "description": "This is a test book created during API testing",
            "coverUrl": "/uploads/covers/test-cover.jpg",
            "bookUrl": "/uploads/books/test-book.pdf",
            "audioUrl": "/uploads/audio/test-audio.mp3",
            "pages": 250,
            "language": "French",
            "publishedYear": 2024
        }
        
        response = requests.post(f"{BASE_URL}/books", json=new_book)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            result = response.json()
            book = result.get('book', {})
            created_book_id = book.get('id')
            
            print(f"✅ Book created successfully with ID: {created_book_id}")
            print(f"✅ Title: {book.get('title')}")
            print(f"✅ Author: {book.get('author')}")
            
            if created_book_id and book.get('title') == new_book['title']:
                print("✅ Book creation working correctly")
            else:
                print("❌ Book creation response invalid")
                return False
        else:
            print(f"❌ Book creation failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 2: GET /api/books/{id} - Get single book
        print(f"\n2. Testing GET /api/books/{created_book_id} - Get single book")
        
        response = requests.get(f"{BASE_URL}/books/{created_book_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            book = result.get('book', {})
            
            print(f"✅ Book retrieved successfully:")
            print(f"   - ID: {book.get('id')}")
            print(f"   - Title: {book.get('title')}")
            print(f"   - Author: {book.get('author')}")
            
            if book.get('id') == created_book_id:
                print("✅ Single book retrieval working correctly")
            else:
                print("❌ Retrieved book ID doesn't match")
                return False
        else:
            print(f"❌ Single book retrieval failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 3: PUT /api/books/{id} - Update book
        print(f"\n3. Testing PUT /api/books/{created_book_id} - Update book")
        
        update_data = {
            "title": "Updated Test Book Title",
            "description": "This book has been updated during API testing",
            "pages": 300
        }
        
        response = requests.put(f"{BASE_URL}/books/{created_book_id}", json=update_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            book = result.get('book', {})
            
            print(f"✅ Book updated successfully:")
            print(f"   - New Title: {book.get('title')}")
            print(f"   - New Description: {book.get('description')}")
            print(f"   - New Pages: {book.get('pages')}")
            
            if (book.get('title') == update_data['title'] and 
                book.get('pages') == update_data['pages']):
                print("✅ Book update working correctly")
            else:
                print("❌ Book update not applied correctly")
                return False
        else:
            print(f"❌ Book update failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 4: DELETE /api/books/{id} - Delete book
        print(f"\n4. Testing DELETE /api/books/{created_book_id} - Delete book")
        
        response = requests.delete(f"{BASE_URL}/books/{created_book_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            success = result.get('success')
            
            print(f"✅ Book deletion response: {success}")
            
            if success:
                print("✅ Book deletion working correctly")
                
                # Verify book is actually deleted
                verify_response = requests.get(f"{BASE_URL}/books/{created_book_id}")
                if verify_response.status_code == 404:
                    print("✅ Book successfully deleted (verified)")
                else:
                    print("❌ Book still exists after deletion")
                    return False
            else:
                print("❌ Book deletion response invalid")
                return False
        else:
            print(f"❌ Book deletion failed with status {response.status_code}: {response.text}")
            return False
            
        print("✅ Books CRUD operations tests completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Books CRUD test failed: {str(e)}")
        
        # Cleanup: try to delete the created book if it exists
        if created_book_id:
            try:
                requests.delete(f"{BASE_URL}/books/{created_book_id}")
                print(f"🧹 Cleanup: Attempted to delete test book {created_book_id}")
            except:
                pass
                
        return False

def test_additional_endpoints():
    """Test additional endpoints like categories and authors"""
    print("\n=== Testing Additional Endpoints ===")
    
    try:
        # Test 1: GET /api/categories
        print("1. Testing GET /api/categories")
        
        response = requests.get(f"{BASE_URL}/categories")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            categories = result.get('categories', [])
            
            print(f"✅ Categories retrieved: {len(categories)} categories")
            print(f"✅ Categories: {categories}")
            
            if isinstance(categories, list):
                print("✅ Categories endpoint working correctly")
            else:
                print("❌ Categories response format invalid")
                return False
        else:
            print(f"❌ Categories endpoint failed with status {response.status_code}: {response.text}")
            return False
            
        # Test 2: GET /api/authors
        print("\n2. Testing GET /api/authors")
        
        response = requests.get(f"{BASE_URL}/authors")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            authors = result.get('authors', [])
            
            print(f"✅ Authors retrieved: {len(authors)} authors")
            print(f"✅ Authors: {authors}")
            
            if isinstance(authors, list):
                print("✅ Authors endpoint working correctly")
            else:
                print("❌ Authors response format invalid")
                return False
        else:
            print(f"❌ Authors endpoint failed with status {response.status_code}: {response.text}")
            return False
            
        print("✅ Additional endpoints tests completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Additional endpoints test failed: {str(e)}")
        return False

def main():
    """Run all backend API tests"""
    print("🚀 Starting Backend API Tests for Immersive Library Application")
    print(f"🌐 Base URL: {BASE_URL}")
    print("=" * 80)
    
    test_results = {}
    
    # Run all tests
    test_results['books_pagination'] = test_books_api_pagination()
    test_results['upload_api'] = test_upload_api()
    test_results['chat_ai'] = test_chat_ai_api()
    test_results['admin_api'] = test_admin_api()
    test_results['books_crud'] = test_books_crud()
    test_results['additional_endpoints'] = test_additional_endpoints()
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend API tests passed successfully!")
        return True
    else:
        print("⚠️  Some backend API tests failed. Please check the details above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)