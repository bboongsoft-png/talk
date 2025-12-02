const { v4: uuidv4 } = require('uuid');

/**
 * 새로운 사용자 ID 생성
 * UUID v4는 중복 확률이 극히 낮아 안전함 (5.3x10^-37)
 */
const generateUserId = () => {
  return uuidv4();
};

/**
 * 짧은 랜덤 ID 생성 (8자리)
 * 표시용으로 사용 가능한 간단한 ID
 */
const generateShortId = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * UUID 유효성 검증
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

module.exports = {
  generateUserId,
  generateShortId,
  isValidUUID
};