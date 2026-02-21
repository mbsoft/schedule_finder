#!/usr/bin/env python3

import requests
import sys
import os
from datetime import datetime
import json
from typing import Dict, List

class MTLLSlotEngineAPITester:
    def __init__(self):
        # Use the production URL from frontend/.env
        with open("/app/frontend/.env", "r") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    self.base_url = line.split("=")[1].strip()
                    break
        
        self.api_url = f"{self.base_url}/api"
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.surveyor_id = "josh-001"
        
        print(f"🔧 Testing API at: {self.api_url}")
        print(f"📅 Test started at: {datetime.now().isoformat()}")
        print("=" * 60)

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   {method} {url}")
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, json=data, params=params, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=self.headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASS - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"   ❌ FAIL - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   📝 Response: {error_detail}")
                except:
                    print(f"   📝 Response: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"   ⏱️  TIMEOUT - Request took longer than 30 seconds")
            return False, {}
        except Exception as e:
            print(f"   💥 ERROR - {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic API health"""
        return self.run_test("API Health Check", "GET", "/", 200)

    def test_seed_data(self):
        """Test seeding Josh's schedule data"""
        return self.run_test("Seed Initial Data", "POST", "/seed-data", 200)

    def test_get_config(self):
        """Test getting configuration"""
        return self.run_test("Get Configuration", "GET", "/config", 200)

    def test_update_config(self):
        """Test updating configuration"""
        config_updates = {
            "survey_duration_mins": 95,
            "working_hours_start": "08:30",
            "buffer_mins_each_side": 20
        }
        return self.run_test("Update Configuration", "PUT", "/config", 200, data=config_updates)

    def test_api_key_operations(self):
        """Test API key management"""
        # Check initial status
        success1, _ = self.run_test("Check API Key Status", "GET", "/api-key/status", 200)
        
        # Save test API key
        test_key = {"nextbillion_key": "test-key-12345"}
        success2, _ = self.run_test("Save API Key", "POST", "/api-key", 200, data=test_key)
        
        # Check status again
        success3, response = self.run_test("Verify API Key Saved", "GET", "/api-key/status", 200)
        if success3 and not response.get("has_key"):
            print("   ⚠️  WARNING: API key not saved properly")
            return False
        
        return success1 and success2 and success3

    def test_surveyors(self):
        """Test surveyor management"""
        # Get surveyors
        success1, surveyors_data = self.run_test("Get Surveyors", "GET", "/surveyors", 200)
        
        # Get specific surveyor (Josh)
        success2, josh_data = self.run_test("Get Josh Surveyor", "GET", f"/surveyors/{self.surveyor_id}", 200)
        
        if success1 and success2:
            if len(surveyors_data) == 0:
                print("   ⚠️  WARNING: No surveyors found - data may not be seeded")
                return False
            if not josh_data:
                print("   ⚠️  WARNING: Josh surveyor not found")
                return False
            print(f"   📊 Found {len(surveyors_data)} surveyor(s), Josh active: {josh_data.get('active', False)}")
        
        return success1 and success2

    def test_schedule_operations(self):
        """Test schedule management"""
        # Get Josh's schedule
        success1, schedule_data = self.run_test(
            "Get Josh's Schedule", 
            "GET", 
            "/schedule", 
            200, 
            params={"surveyor_id": self.surveyor_id}
        )
        
        if success1:
            job_count = len([entry for entry in schedule_data if entry.get("job_type") != "BLOCK"])
            block_count = len([entry for entry in schedule_data if entry.get("job_type") == "BLOCK"])
            print(f"   📊 Schedule: {job_count} jobs, {block_count} blocks across {len(set([e['date'] for e in schedule_data]))} days")
            
            if len(schedule_data) == 0:
                print("   ⚠️  WARNING: No schedule entries found")
                return False
        
        return success1

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, stats_data = self.run_test(
            "Get Dashboard Stats", 
            "GET", 
            "/dashboard-stats", 
            200, 
            params={"surveyor_id": self.surveyor_id}
        )
        
        if success:
            print(f"   📊 Stats: {stats_data.get('total_jobs', 0)} jobs, {stats_data.get('total_gaps', 0)} gaps")
            print(f"   📊 Gaps: {stats_data.get('strong_gaps', 0)} strong, {stats_data.get('tight_gaps', 0)} tight")
            
            required_keys = ["total_jobs", "total_gaps", "strong_gaps", "tight_gaps", "jobs_by_day"]
            missing_keys = [key for key in required_keys if key not in stats_data]
            if missing_keys:
                print(f"   ⚠️  WARNING: Missing stats keys: {missing_keys}")
                return False
        
        return success

    def test_gap_finder(self):
        """Test gap finding functionality (Layer 1)"""
        success, gaps_data = self.run_test(
            "Find Gaps (Layer 1)", 
            "GET", 
            "/gaps", 
            200, 
            params={"surveyor_id": self.surveyor_id}
        )
        
        if success:
            strong_gaps = [g for g in gaps_data if g.get("gap_type") == "STRONG"]
            tight_gaps = [g for g in gaps_data if g.get("gap_type") == "TIGHT"]
            print(f"   📊 Found {len(gaps_data)} total gaps: {len(strong_gaps)} strong, {len(tight_gaps)} tight")
            
            if len(gaps_data) == 0:
                print("   ⚠️  WARNING: No gaps found - schedule may be too dense")
        
        return success, gaps_data

    def test_viability_check(self, gaps_data: List[Dict]):
        """Test viability checking functionality (Layer 2)"""
        if not gaps_data:
            print("   ⚠️  SKIP: No gaps available for viability testing")
            return True
        
        # Test single viability check
        test_gap = gaps_data[0]
        viability_request = {
            "lead_postcode": "B1 1AA",
            "gap_id": test_gap["id"]
        }
        success1, viability_result = self.run_test(
            "Single Viability Check", 
            "POST", 
            "/viability-check", 
            200, 
            data=viability_request
        )
        
        # Test bulk viability check
        success2, bulk_results = self.run_test(
            "Bulk Viability Check", 
            "POST", 
            "/viability-check-bulk", 
            200,
            params={"lead_postcode": "B1 1AA", "surveyor_id": self.surveyor_id}
        )
        
        if success1:
            print(f"   📊 Gap viability: {viability_result.get('viable', False)} - {viability_result.get('reason', 'No reason')}")
        
        if success2:
            viable_count = len([r for r in bulk_results if r.get("viable")])
            print(f"   📊 Bulk check: {viable_count}/{len(bulk_results)} slots viable")
        
        return success1 and success2

    def test_preference_filter(self):
        """Test preference filtering functionality (Layer 3)"""
        # Test morning preference
        preferences = {
            "preferred_day": "Monday",
            "time_of_day": "morning",
            "specific_date": ""
        }
        success1, morning_offers = self.run_test(
            "Preference Filter - Morning Monday", 
            "POST", 
            "/preference-filter", 
            200, 
            data=preferences,
            params={"surveyor_id": self.surveyor_id}
        )
        
        # Test afternoon preference
        preferences["time_of_day"] = "afternoon"
        success2, afternoon_offers = self.run_test(
            "Preference Filter - Afternoon Monday", 
            "POST", 
            "/preference-filter", 
            200, 
            data=preferences,
            params={"surveyor_id": self.surveyor_id}
        )
        
        if success1:
            morning_matches = len([o for o in morning_offers if o.get("preference_match")])
            print(f"   📊 Morning offers: {len(morning_offers)} total, {morning_matches} matches")
        
        if success2:
            afternoon_matches = len([o for o in afternoon_offers if o.get("preference_match")])
            print(f"   📊 Afternoon offers: {len(afternoon_offers)} total, {afternoon_matches} matches")
        
        return success1 and success2

    def test_geocode_endpoint(self):
        """Test geocoding functionality"""
        geocode_request = {
            "postcode": "B15 2TT",
            "country": "United Kingdom"
        }
        # This might fail if no API key is configured, which is expected
        success, result = self.run_test("Geocode Test", "POST", "/geocode", 200, data=geocode_request)
        
        # If it fails with 400, that's expected without API key
        if not success:
            print("   📝 NOTE: Geocode test expected to fail without API key configured")
            return True  # Not a critical failure
        
        return success

    def run_all_tests(self):
        """Run all test suites"""
        print("\n🚀 STARTING MTLL SLOT ENGINE API TESTS")
        print("=" * 60)

        # 1. Health check
        health_ok, _ = self.test_health_check()
        
        # 2. Seed data first
        seed_ok, _ = self.test_seed_data()
        if not seed_ok:
            print("\n❌ CRITICAL: Cannot seed data - stopping tests")
            return 1
        
        # 3. Test configuration
        config_ok = self.test_get_config()
        config_update_ok, _ = self.test_update_config()
        
        # 4. Test API key management
        api_key_ok = self.test_api_key_operations()
        
        # 5. Test surveyors
        surveyors_ok = self.test_surveyors()
        
        # 6. Test schedule
        schedule_ok = self.test_schedule_operations()
        
        # 7. Test dashboard stats
        dashboard_ok = self.test_dashboard_stats()
        
        # 8. Test gap finder (Layer 1)
        gap_finder_ok, gaps_data = self.test_gap_finder()
        
        # 9. Test viability check (Layer 2)
        viability_ok = self.test_viability_check(gaps_data if gap_finder_ok else [])
        
        # 10. Test preference filter (Layer 3)
        preference_ok = self.test_preference_filter()
        
        # 11. Test geocoding (optional)
        geocode_ok = self.test_geocode_endpoint()
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        print("=" * 60)
        
        # Detailed results
        core_tests = [health_ok, seed_ok, config_ok, config_update_ok, surveyors_ok, schedule_ok, dashboard_ok]
        layer_tests = [gap_finder_ok, viability_ok, preference_ok]
        optional_tests = [api_key_ok, geocode_ok]
        
        core_passed = sum(core_tests)
        layer_passed = sum(layer_tests) 
        optional_passed = sum(optional_tests)
        
        print(f"🏗️  Core API Functionality: {core_passed}/{len(core_tests)} ({'✅' if core_passed == len(core_tests) else '❌'})")
        print(f"⚡ MTLL Layers (1-3): {layer_passed}/{len(layer_tests)} ({'✅' if layer_passed == len(layer_tests) else '❌'})")
        print(f"🔧 Optional Features: {optional_passed}/{len(optional_tests)} ({'✅' if optional_passed >= 1 else '❌'})")
        
        # Critical failure check
        if core_passed < len(core_tests) - 1:  # Allow 1 core test to fail
            print("\n🚨 CRITICAL: Core API functionality broken")
            return 2
        
        if layer_passed == 0:
            print("\n🚨 CRITICAL: All MTLL layers broken")
            return 2
        
        print(f"\n🎯 Overall API Health: {((self.tests_passed / self.tests_run) * 100):.1f}%")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    """Main test execution"""
    try:
        tester = MTLLSlotEngineAPITester()
        return tester.run_all_tests()
    except Exception as e:
        print(f"💥 FATAL ERROR: {str(e)}")
        return 3

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)