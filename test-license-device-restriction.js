
// Test script to verify one license per device restriction
const { SimpleLicenseStorage } = require('./server/license-storage-simple.ts');

async function testDeviceRestriction() {
  console.log('🧪 Testing one license per device restriction...\n');
  
  const storage = new SimpleLicenseStorage();
  const testLicenseKey = '8B48977B-F9BC41F3-B1B8EA51-A2B6109E'; // From logs
  
  // Test 1: Activate on first device
  console.log('📱 Test 1: Activating license on Device A...');
  try {
    const result1 = storage.activateDevice(testLicenseKey, 'device-a-12345', 'Device A');
    console.log('✅ Result:', result1.success ? 'SUCCESS' : 'FAILED');
    console.log('📋 Message:', result1.message);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n' + '─'.repeat(50) + '\n');
  
  // Test 2: Try to activate on second device (should fail)
  console.log('📱 Test 2: Attempting to activate same license on Device B...');
  try {
    const result2 = storage.activateDevice(testLicenseKey, 'device-b-67890', 'Device B');
    console.log('✅ Result:', result2.success ? 'SUCCESS' : 'FAILED');
    console.log('📋 Message:', result2.message);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n' + '─'.repeat(50) + '\n');
  
  // Test 3: Check active devices
  console.log('📋 Test 3: Checking active devices for this license...');
  const activeDevices = storage.getActiveDevices(testLicenseKey);
  console.log('🔢 Active device count:', activeDevices.length);
  activeDevices.forEach((device, index) => {
    console.log(`   ${index + 1}. Device ID: ${device.deviceId}`);
    console.log(`      Activated: ${device.activatedAt}`);
  });
  
  console.log('\n🎯 Test Summary:');
  console.log('- One license per device restriction:', activeDevices.length === 1 ? '✅ WORKING' : '❌ BROKEN');
  console.log('- Expected behavior: First device succeeds, second device fails');
}

testDeviceRestriction().catch(console.error);
