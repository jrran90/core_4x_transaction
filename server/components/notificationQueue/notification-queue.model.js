const Promise = require('bluebird');
const path = require('path');
const mongoose = require('mongoose');
const moment = require('moment');
const config = require('../../../config/config');




/**
 * Transaction Notification Schema
 */
const NotificationQueueSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
    'merchantEmail',
    'userEmail',
    'userPushNotif',
    'broadcastNotification',
    'merchantCallback',
    'transactionEmailReminder',
    'transactionEmailReminderFollowUp',
    'reqLimitWaitVerif',
    'reqLimitHasApprove',
    'reqLimitHasApproveWithLimit',
    'reqLimitHasReject',
    'reqLimitSuccessAndWaitForVerify',
    'reqLimitGetEmailToReadAgreement',
    'reqLimitDecreaseLimitWaitForVerify',
    'reqLimitDecreaseApprove',
    'reqLimitDecreaseHasReject',
    'E1-transactionReminder',
    'E2-transactionReminder',
    'IF1-transactionReminder',
    'IF2-transactionReminder',
    'IC1-transactionReminder',
    'IC2-transactionReminder',
    'FA1-transactionReminder',
    'FA2-transactionReminder',
    'userVerifyEmail'
    ]
  },
  isTransaction: {
    type: Boolean,
    default: false
  },
  sent: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.ObjectId,
    required: 'Please fill in user / client id',
    ref: 'User'
  },
  transactionNumber: {
    type: String,
    required: true
  },
  detail: {},
  log: [{
    createdAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    sent: {
      type: Boolean,
      required: true,
      default: false
    },
    response: {}
  }]
}, { timestamps: true, runSettersOnQuery: true });



/**
 * Statics
 */
NotificationQueueSchema.statics = {
  /**
   * Get Transaction Notification
   * @param {ObjectId} id - The objectId of transaction.
   * @returns {Promise<Transaction, APIError>}
   */
  get(id) {
    return this.findById(id)
      .exec()
      .then((transaction) => {
        if (transaction) {
          return transaction;
        }
        const err = new APIError('No such transaction notification exists!', httpStatus.NOT_FOUND);
        return Promise.reject(err);
      });
  },

  /**
   * List Transaction Notifications in descending order of 'createdAt' timestamp.
   * @param {number} skip - Number of transactions to be skipped.
   * @param {number} limit - Limit number of transactions to be returned.
   * @returns {Promise<Transaction[]>}
   */
  list({ skip = 0, limit = 50 } = {}) {
    return this.find()
      .sort({ createdAt: -1 })
      .skip(+skip)
      .limit(+limit)
      .exec();
  }
};


/**
 * @typedef Fees
 */
module.exports = mongoose.connection.useDb(config.mongo.user_host).model('NotificationQueue', NotificationQueueSchema);