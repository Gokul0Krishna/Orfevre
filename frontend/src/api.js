/**
 * api.js — Centralized API service layer for YuvaShakti frontend.
 *
 * All backend calls go through here.
 * The Vite proxy in vite.config.js forwards /api/* to http://127.0.0.1:8000
 */

const API_BASE = '/api';

// ─── Helper ────────────────────────────────────────────
async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ─── User / Profile ────────────────────────────────────
export function getUser(userId) {
  return request(`/user/${userId}`);
}

export function updateUser(userId, data) {
  return request(`/user/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── SkillFlow ─────────────────────────────────────────
export function completeGig(gigId, youthId, vendorId) {
  return request('/complete-gig', {
    method: 'POST',
    body: JSON.stringify({ gigId, youthId, vendorId }),
  });
}

export function getSkillGap(trade, currentSkills, district, goal) {
  return request('/skill-gap', {
    method: 'POST',
    body: JSON.stringify({ trade, currentSkills, district, goal }),
  });
}

export function uploadProof(userId, skill, file) {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('skill', skill);
  formData.append('file', file);

  return fetch('/api/upload-proof', {
    method: 'POST',
    body: formData,
    // Note: Don't set Content-Type header manually for FormData, 
    // fetch will set it with the correct boundary.
  }).then(res => res.json());
}

export function matchSchemes(userId) {
  return request(`/match-schemes/${userId}`);
}

// ─── BazaarPulse ───────────────────────────────────────
export function updateInventory(vendorId, products) {
  return request('/inventory/update', {
    method: 'POST',
    body: JSON.stringify({ vendorId, products }),
  });
}

export function getDemandForecast(trade, district, month, products) {
  return request('/demand-forecast', {
    method: 'POST',
    body: JSON.stringify({ trade, district, month, products }),
  });
}

export function generateListing(vendorId, productDescription, trade, district) {
  return request('/generate-listing', {
    method: 'POST',
    body: JSON.stringify({ vendorId, productDescription, trade, district }),
  });
}

export function recordSale(vendorId, buyerId, amount, productId) {
  return request('/sale', {
    method: 'POST',
    body: JSON.stringify({ vendorId, buyerId, amount, productId }),
  });
}

// ─── GramLens ──────────────────────────────────────────
export function getGraphData() {
  return request('/graph/data');
}

export function getClusterVelocity() {
  return request('/graph/velocity');
}

export function getBridgeNodes() {
  return request('/graph/bridge-nodes');
}

export function getClusterStats(district) {
  return request(`/cluster/${district}/stats`);
}

// ─── Gigs ──────────────────────────────────────────────
export function getGigs() {
  return request('/gigs');
}

export function applyForGig(gigId, youthUid) {
  return request(`/gigs/${gigId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ youth_uid: youthUid })
  });
}

export function getGigApplications(gigId) {
  return request(`/gigs/${gigId}/applications`);
}

export function acceptApplication(gigId, appId, merchantUid) {
  return request(`/gigs/${gigId}/applications/${appId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ merchant_uid: merchantUid })
  });
}

export function getMyApplications(youthUid) {
  return request(`/applications/mine?youth_uid=${youthUid}`);
}

// ─── Merchant Shop ──────────────────────────────────────────────────────────
export function getMerchantShop(merchantUid) {
  return request(`/merchant/shop?merchant_uid=${merchantUid}`);
}

export function saveMerchantShop(data) {
  return request('/merchant/shop', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getBusinessTypes() {
  return request('/merchant/business-types');
}

// ─── Recruitment Chatbot ──────────────────────────────────────────────────
export function parseGig(merchantUid, text) {
  return request('/recruitment/parse-gig', {
    method: 'POST',
    body: JSON.stringify({ merchant_uid: merchantUid, text }),
  });
}

export function postGig(data) {
  return request('/recruitment/post-gig', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Verification & Trust Score ──────────────────────────────────────────
export function uploadWorkEvidence(userId, workDescription, file) {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('work_description', workDescription);
  formData.append('file', file);

  return fetch(`${API_BASE}/verify/upload-work`, {
    method: 'POST',
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error('Failed to upload work evidence');
    return res.json();
  });
}

export function getTradeSkills(trade) {
  return request(`/verify/skills/${trade}`);
}

export function uploadSkillTask(userId, skillId, file) {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('skill_id', skillId);
  formData.append('file', file);

  return fetch(`${API_BASE}/verify/upload-skill-task`, {
    method: 'POST',
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error('Failed to upload skill task');
    return res.json();
  });
}

export function getTrustScore(userId) {
  return request(`/verify/trust-score/${userId}`);
}

export function getWorkHistory(userId) {
  return request(`/verify/work-history/${userId}`);
}

// ─── Chatbot ───────────────────────────────────────────
export function sendChatMessage(message, language = 'en') {
  return request('/chatbot', {
    method: 'POST',
    body: JSON.stringify({ message, language }),
  });
}
