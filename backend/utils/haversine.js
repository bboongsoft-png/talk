/**
 * Haversine 공식을 이용한 두 GPS 좌표 간 거리 계산
 * @param {number} lat1 - 첫 번째 위치의 위도
 * @param {number} lon1 - 첫 번째 위치의 경도
 * @param {number} lat2 - 두 번째 위치의 위도
 * @param {number} lon2 - 두 번째 위치의 경도
 * @returns {number} - 두 지점 간의 거리(km)
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름 (km)
  
  // 도를 라디안으로 변환
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // 거리 계산 (km)
  const distance = R * c;
  
  // 소수점 둘째 자리까지 반올림
  return Math.round(distance * 100) / 100;
}

module.exports = haversine;