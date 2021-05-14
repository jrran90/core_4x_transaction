const validate = require('express-validation');
const paramValidation = require('./preapproved-transaction.validation');
const preApprovedTransactionCtrl = require('./preapproved-transaction.controller');
const { invokeRolesPolicies, isAllowed } = require('./preapproved-transaction.policy');

invokeRolesPolicies();           // invoking roles policies


module.exports =  app => {
  app.route('/api/preapprovedtransactions/')
    /** POST /api/approvedTransactions - Create new approved transaction */
    .post(validate(paramValidation.createApprovedTransaction), preApprovedTransactionCtrl.create);

  app.route('/api/preapprovedtransactions/')
    /** POST /api/approvedTransactions - Create new approved transaction */
    .post(validate(paramValidation.createApprovedTransaction), preApprovedTransactionCtrl.createV2);

  app.route('/api/preapprovedtransactions/init')
    /** POST /api/prepreapprovedtransactions/init **/
    .post(validate(paramValidation.createApprovedTransaction), preApprovedTransactionCtrl.init);

  app.route('/api/preapprovedtransactions/init/internal')
    /** POST /api/prepreapprovedtransactions/init **/
    .post(preApprovedTransactionCtrl.initInternal);

  app.route('/api/preapprovedtransactions/defaultcard/:transactionNumber')
    /** POST /api/:transactionNumber/defaultcard - Get list of approvedTransactions */
    .post(validate(paramValidation.getUserDefaultCardDetail), preApprovedTransactionCtrl.getUserDefaultCardDetail);

  app.route('/api/preapprovedtransactions/token')
    /** POST /api/prepreapprovedtransactions - Update preapprovedtransaction card token */
    .post(validate(paramValidation.updateCardToken), preApprovedTransactionCtrl.updateCardToken);


  // PUBLISHED ENDPOINTS

  app.route('/api/:preApprovedTransactionId/validating_transaction')
    /** POST /api/approvedTransactions - Create new approved transaction */
    .post(validate(paramValidation.createV2), preApprovedTransactionCtrl.createV2);

  app.route('/api/:preApprovedTransactionId/token')
    /** POST /api/preapprovedtransactions - Update preapprovedtransaction card token */
    .post(validate(paramValidation.updateCardTokenV2), preApprovedTransactionCtrl.updateCardTokenV2);

  /** Load approvedTransaction when API with transactionNumber route parameter is hit */
  app.param('transactionNumber', preApprovedTransactionCtrl.loadTransactionNumber);

  /** Load approvedTransaction when API with approvedTransactionId route parameter is hit */
  app.param('preApprovedTransactionId', preApprovedTransactionCtrl.load);
};