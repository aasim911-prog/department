import requests
import sys
import json
from datetime import datetime

class StudentMarksAPITester:
    def __init__(self, base_url="https://studentmarks-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.teacher_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            
            if success:
                print(f"   Status: {response.status_code} ✅")
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True)
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                print(f"   Status: {response.status_code} ❌")
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_test(name, False, error_msg)
            return False, {}

    def test_teacher_registration(self):
        """Test teacher registration"""
        teacher_data = {
            "name": "Dr. John Smith",
            "email": f"teacher_{datetime.now().strftime('%H%M%S')}@aiml.edu",
            "role": "teacher",
            "department": "AI/ML"
        }
        
        success, response = self.run_test(
            "Teacher Registration",
            "POST",
            "auth/register",
            200,
            data=teacher_data
        )
        
        if success and 'token' in response:
            self.teacher_token = response['token']
            print(f"   Teacher token obtained: {self.teacher_token[:20]}...")
            return True, response['user']
        return False, {}

    def test_student_registration(self):
        """Test student registration"""
        student_data = {
            "name": "Alice Johnson",
            "student_id": f"STU{datetime.now().strftime('%H%M%S')}",
            "role": "student",
            "department": "AI/ML",
            "semester": 3
        }
        
        success, response = self.run_test(
            "Student Registration",
            "POST",
            "auth/register",
            200,
            data=student_data
        )
        
        if success and 'token' in response:
            self.student_token = response['token']
            print(f"   Student token obtained: {self.student_token[:20]}...")
            return True, response['user']
        return False, {}

    def test_teacher_login(self, email):
        """Test teacher login"""
        login_data = {
            "identifier": email,
            "password": "teacher"
        }
        
        success, response = self.run_test(
            "Teacher Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.teacher_token = response['token']
            return True
        return False

    def test_student_login(self, student_id):
        """Test student login"""
        login_data = {
            "identifier": student_id,
            "password": "student"
        }
        
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.student_token = response['token']
            return True
        return False

    def test_auth_me(self, token, role):
        """Test get current user"""
        headers = {'Authorization': f'Bearer {token}'}
        success, response = self.run_test(
            f"Get Current User ({role})",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        return success, response

    def test_create_subject(self):
        """Test creating a subject"""
        if not self.teacher_token:
            self.log_test("Create Subject", False, "No teacher token available")
            return False, {}

        subject_data = {
            "name": "Machine Learning Fundamentals",
            "code": f"ML{datetime.now().strftime('%H%M')}",
            "semester": 3,
            "credits": 4,
            "department": "AI/ML"
        }
        
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Create Subject",
            "POST",
            "subjects",
            200,
            data=subject_data,
            headers=headers
        )
        return success, response

    def test_get_subjects(self):
        """Test getting subjects"""
        success, response = self.run_test(
            "Get Subjects",
            "GET",
            "subjects?department=AI/ML&semester=3",
            200
        )
        return success, response

    def test_get_students(self):
        """Test getting students (teacher only)"""
        if not self.teacher_token:
            self.log_test("Get Students", False, "No teacher token available")
            return False, {}

        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Get Students",
            "GET",
            "students?department=AI/ML",
            200,
            headers=headers
        )
        return success, response

    def test_upload_marks(self, student_id, subject_id):
        """Test uploading marks"""
        if not self.teacher_token:
            self.log_test("Upload Marks", False, "No teacher token available")
            return False, {}

        marks_data = {
            "student_id": student_id,
            "subject_id": subject_id,
            "semester": 3,
            "internal1": 35.0,
            "internal2": 38.0,
            "internal3": 40.0,
            "final_exam": 85.0
        }
        
        headers = {'Authorization': f'Bearer {self.teacher_token}'}
        success, response = self.run_test(
            "Upload Marks",
            "POST",
            "marks",
            200,
            data=marks_data,
            headers=headers
        )
        return success, response

    def test_get_student_marks(self, student_id):
        """Test getting student marks"""
        if not self.student_token:
            self.log_test("Get Student Marks", False, "No student token available")
            return False, {}

        headers = {'Authorization': f'Bearer {self.student_token}'}
        success, response = self.run_test(
            "Get Student Marks",
            "GET",
            f"marks/student/{student_id}",
            200,
            headers=headers
        )
        return success, response

    def test_student_dashboard(self, student_data):
        """Test student dashboard with CGPA/SGPA calculations"""
        if not self.student_token:
            self.log_test("Student Dashboard", False, "No student token available")
            return False, {}

        # Use student_id (string identifier) not UUID
        student_id = student_data.get('student_id')
        headers = {'Authorization': f'Bearer {self.student_token}'}
        success, response = self.run_test(
            "Student Dashboard",
            "GET",
            f"dashboard/student/{student_id}",
            200,
            headers=headers
        )
        
        if success and response:
            # Verify CGPA calculation
            cgpa = response.get('cgpa', 0)
            semester_data = response.get('semester_data', {})
            
            print(f"   CGPA: {cgpa}")
            print(f"   Semesters with data: {len([s for s in semester_data.values() if s.get('subjects')])}")
            
            # Check if grade point calculation is working (85 marks should give 9.0 grade point)
            for sem_key, sem_data in semester_data.items():
                for subject in sem_data.get('subjects', []):
                    final_marks = subject.get('marks', {}).get('final_exam')
                    grade_point = subject.get('grade_point')
                    if final_marks == 85.0:
                        expected_grade = 9.0
                        if grade_point == expected_grade:
                            print(f"   ✅ Grade calculation correct: {final_marks} marks = {grade_point} grade point")
                        else:
                            print(f"   ❌ Grade calculation error: {final_marks} marks = {grade_point} grade point (expected {expected_grade})")
        
        return success, response

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Comprehensive API Testing for Student Marks Dashboard")
        print("=" * 70)

        # Test teacher registration and login
        teacher_success, teacher_user = self.test_teacher_registration()
        if not teacher_success:
            print("❌ Teacher registration failed, stopping tests")
            return self.generate_report()

        # Test student registration and login
        student_success, student_user = self.test_student_registration()
        if not student_success:
            print("❌ Student registration failed, stopping tests")
            return self.generate_report()

        # Test auth/me endpoints
        self.test_auth_me(self.teacher_token, "teacher")
        self.test_auth_me(self.student_token, "student")

        # Test subject creation
        subject_success, subject_data = self.test_create_subject()
        
        # Test getting subjects
        self.test_get_subjects()

        # Test getting students
        self.test_get_students()

        # Test marks upload if we have both student and subject
        if subject_success and student_user:
            marks_success, marks_data = self.test_upload_marks(
                student_user['id'], 
                subject_data.get('id')
            )

            # Test getting student marks
            self.test_get_student_marks(student_user['id'])

            # Test student dashboard
            self.test_student_dashboard(student_user['id'])

        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")

        # Show failed tests
        failed_tests = [t for t in self.test_results if t['status'] == 'FAILED']
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")

        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = StudentMarksAPITester()
    results = tester.run_comprehensive_test()
    
    # Return appropriate exit code
    return 0 if results["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())