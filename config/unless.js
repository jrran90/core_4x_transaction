const unlessJwt = {
  basicAuth: {
    path: [
      { url: '/api/auth/random-number', methods: ['GET'] },
      { url: '/api/health-check', methods: ['GET'] },
      {url: '/api/approvedtransactions/gopaycallback', methods: ['POST']},
      {url: '/api/approvedtransactions/danacallback', methods: ['POST']},
      {url: /\/api\/preapprovedtransactions/i, methods: ['POST']},
      {url: /\/api\/preapprovedtransactions\/init/i, methods: ['POST']},
      {url: '/api/approvedtransactions/v3', methods: ['POST']},

      {url: '/api/generate_authentication', methods: ['POST']},
      {url: /\/fees/i, methods: ['GET']},
      {url: /\/check_callback/i, methods: ['GET']},
      {url: /\/get_transaction_properties/i, methods: ['GET']},
      {url: /\/validating_transaction/i, methods: ['POST']},
      {url: /\/token/i, methods: ['POST']}
    ],
  },
  jwt: {
    path: [
      { url: '/api/auth/random-number', methods: ['GET'] },
      { url: '/api/health-check', methods: ['GET'] },
      {url: '/api/approvedtransactions/generate/authentication', methods: ['POST']},
      {url: /\/api\/preapprovedtransactions/i, methods: ['POST']},
      {url: /\/api\/preapprovedtransactions\/init/i, methods: ['POST']},
      {url: '/api/approvedtransactions/gopaycallback', methods: ['POST']},
      {url: '/api/approvedtransactions/danacallback', methods: ['POST']},
      {url: '/api/approvedtransactions/v3', methods: ['POST']},

      {url: '/api/generate_authentication', methods: ['POST']},
      {url: /\/fees/i, methods: ['GET']},
      {url: /\/check_callback/i, methods: ['GET']},
      {url: /\/get_transaction_properties/i, methods: ['GET']},
      {url: /\/validating_transaction/i, methods: ['POST']},
      {url: /\/token/i, methods: ['POST']}
    ],
  },
};

module.exports = unlessJwt;
