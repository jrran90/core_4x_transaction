const axios = require('axios');
const moment = require('moment');
const request = require('request');
const Store = require('../components/store/store.model');
const Voucher = require('../components/voucher/voucher.model');
const ApprovedTransaction = require('../components/approvedTransaction/approved-transaction.model');


function requester(params) {
  return new Promise((resolve, reject) => {
    try {
      request(params, (err, httpResponse, body) => {
        if (!err && httpResponse.statusCode == 200) {
          const resultVar = JSON.parse(JSON.stringify(body));
          resolve(resultVar);
        } else {
          reject(body);
        }
      });
    } catch (e) {
      reject(e);
    }

  });
}

async function requesterV2(params) {
  return new Promise(async (resolve, reject) => {
    try {
      let success = true, data = {};

      // fetch data from a url endpoint

      data = await axios(params)
        .catch(e => {
          reject(e);
        });

      resolve(data.data);
    } catch (error) {
      reject(error);
    }
  });
}

function callbackMakerAdv(transactionNumber, body, remainingCredit, userId) {
  let bucket = {
    transaction_id: transactionNumber,
    transaction_number: (transactionNumber.indexOf('.') > -1) ? transactionNumber.substring(transactionNumber.indexOf('.') + 1, transactionNumber.length) : transactionNumber,
    success: true,
    status_code: '200',
    status_message: 'success'
  };

  if (remainingCredit) bucket.remainingCredit = remainingCredit;
  if (userId) bucket.userId = userId;
  if (body.total) bucket.gross_amount = body.total;
  if (body.redirectURL) bucket.redirectURL = body.redirectURL;
  if (body.convenienceFee) bucket.convenienceFee = body.convenienceFee;
  if (body.terminDuration) bucket.terminDuration = body.terminDuration;

  let keys = Object.keys(body);

  let counter = 0;

  for (let i = 0; i < keys.length; i++) {
    if (counter < 5) {
      if (keys[i] !== 'transactionNumber' && keys[i] !== 'total' && keys[i] !== 'amount' && keys[i] !== 'store' && keys[i] !== 'md5' && keys[i] !== 'token' && keys[i] !== 'terminDuration' && keys[i] !== 'convenienceFee') {
        bucket[keys[i]] = body[keys[i]];
        ++counter;
      }
    }
  }

  return bucket;
}

async function broadcaster(type, mn, success, detail) {
  const socket = require('socket.io-client')();

  socket.on('connect', () => {
    socket.emit(type, { mn, success, detail });
    socket.close();
  });

  return;
}

async function createTermin(data) {
  // divide the transaction total to EmpatKali and push it into transaction detail
  let devidedTotal = Math.ceil(data.total / 4);
  let termins = [];
  let voucher = null;

  let terminTime = new Date();

  const store = await Store.findById(data.store).select('merchant');
  const automaticVoucher = await checkAutomaticVoucher(data, store.merchant);

  // inserting first payment. it only has 1 hour expired, since the transaction is created
  termins.push({
    number: 1,
    total: devidedTotal,
    due: {
      date: terminTime.setHours(23, 59, 59, 999),
      notified: true
    },
    paid: {
      status: false,
      status_code: '201',
      payment_id: '000000000000',
      date: moment().endOf('day').format('YYYY-MM-DD hh:mm:ss'),
      order_id: `2-${data.transactionNumber}-1`,
      method: '',
      paymentGateway: 'xendit'
    }
  });

  // creating va
  let expireDate, order_id_creator, vaAssets, initCharge, dueDate;
  let paid;

  for (let i = 2; i < 5; i++) {
    // collecting the va requirements
    expireDate = (data.terminDuration == 14) ? moment(dueDate).add((i - 1) * 2, 'w').endOf('day').format('YYYY-MM-DD HH:mm:ss') : moment(dueDate).add(i - 1, 'M').endOf('day').format('YYYY-MM-DD HH:mm:ss');
    order_id_creator = `2-${data.transactionNumber}-${i}`;

    vaAssets = {
      trxid: order_id_creator,
      jumlah: devidedTotal,
      expire: expireDate,
      nama: data.transactionNumber
    };

    let termin = {
      number: i,
      total: devidedTotal,
      due: {
        date: expireDate,
        notified: false
      },
      paid: {
        status: false,
        status_code: '201',
        payment_id: null,
        date: expireDate,
        order_id: order_id_creator,
        method: 'vabni',
        transaction_time: expireDate
      }
    };

    if (automaticVoucher) {
      voucher = automaticVoucher._id;
      let discount = 0;
      let countDiscount = 0;
      if (automaticVoucher.affecting.terminNumber.indexOf(i) > -1) {
        if (automaticVoucher.deduct.type == 'percentage') {
          countDiscount = Math.ceil(data.total * automaticVoucher.deduct.total / 100);
          discount = (countDiscount > automaticVoucher.deduct.maximum) ? automaticVoucher.deduct.maximum : countDiscount
          if (discount > devidedTotal) {
            termin.discount = devidedTotal;
            termin.paid.status = true;
            termin.paid.status_code = '200';
            termin.paid.payment_id = '0000000000';
            termin.paid.order_id = `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`;
            termin.paid.method = 'EMPATKALI_VOUCHER_SYSTEM';
          } else {
            termin.discount = discount;
            vaAssets.jumlah -= discount;

            if (vaAssets.jumlah < 10000) {
              termin.returnedPayment = devidedTotal - discount;
              termin.paid.status = true;
              termin.paid.status_code = '200';
              termin.paid.payment_id = '0000000000';
              termin.paid.order_id = `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`;
              termin.paid.method = 'EMPATKALI_VOUCHER_SYSTEM';
            } else {
              // get the Virtual Account
              initCharge = await requester({
                uri: `http://149.129.252.24/bni/cr8${(process.env.NODE_ENV === 'production') ? '-prod' : ''}.php`,
                method: 'POST',
                json: vaAssets
              });

              termin.paid.payment_id = initCharge.virtual_account;
            }
          }

          // notify the logger
          await requester({
            uri: `http://${(process.env.NODE_ENV === 'production') ? '' : 'sb-'}mon.empatkali.co.id/voucher.php`,
            method: 'post',
            json: {
              'voucherId': automaticVoucher._id,
              'voucherCode': automaticVoucher.code,
              'trxid': `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`,
              'transactionNumber': data.transactionNumber,
              'transactionId': '',
              'discount': discount,
              'terminNumber': automaticVoucher.affecting.terminNumber[0]
            }
          });
        } else {
          discount = automaticVoucher.deduct.total;

          if (discount > devidedTotal) {
            termin.discount = devidedTotal;
            termin.paid.status = true;
            termin.paid.status_code = '200';
            termin.paid.payment_id = '0000000000';
            termin.paid.order_id = `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`;
            termin.paid.method = 'EMPATKALI_VOUCHER_SYSTEM';

            // notify the logger
            await requester({
              uri: `http://${(process.env.NODE_ENV === 'production') ? '' : 'sb-'}mon.empatkali.co.id/voucher.php`,
              method: 'post',
              json: {
                'voucherId': automaticVoucher._id,
                'voucherCode': automaticVoucher.code,
                'trxid': `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`,
                'transactionNumber': data.transactionNumber,
                'transactionId': '',
                'discount': devidedTotal,
                'terminNumber': automaticVoucher.affecting.terminNumber[0]
              }
            });
          } else {
            termin.discount = discount;
            vaAssets.jumlah -= discount;

            if (vaAssets.jumlah < 10000) {
              termin.returnedPayment = devidedTotal - discount;
              termin.paid.status = true;
              termin.paid.status_code = '200';
              termin.paid.payment_id = '0000000000';
              termin.paid.order_id = `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`;
              termin.paid.method = 'EMPATKALI_VOUCHER_SYSTEM';

              // notify the logger
              await requester({
                uri: `http://${(process.env.NODE_ENV === 'production') ? '' : 'sb-'}mon.empatkali.co.id/voucher.php`,
                method: 'post',
                json: {
                  'voucherId': automaticVoucher._id,
                  'voucherCode': automaticVoucher.code,
                  'trxid': `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`,
                  'transactionNumber': data.transactionNumber,
                  'transactionId': '',
                  'discount': discount,
                  'terminNumber': automaticVoucher.affecting.terminNumber[0]
                }
              });
            } else {
              // get the Virtual Account
              initCharge = await requester({
                uri: `http://149.129.252.24/bni/cr8${(process.env.NODE_ENV === 'production') ? '-prod' : ''}.php`,
                method: 'POST',
                json: vaAssets
              });

              termin.paid.payment_id = initCharge.virtual_account;
            }
          }
        }

        await requester({
          uri: `http://${(process.env.NODE_ENV === 'production') ? '' : 'sb-'}mon.empatkali.co.id/voucher.php`,
          method: 'post',
          json: {
            'voucherId': automaticVoucher._id,
            'voucherCode': automaticVoucher.code,
            'trxid': `2-${data.transactionNumber}-${i}-VOUCHER_REDEEM`,
            'transactionNumber': data.transactionNumber,
            'discount': discount,
            'terminNumber': automaticVoucher.affecting.terminNumber[0]
          }
        });

      } else {
        // get the Virtual Account
        initCharge = await requester({
          uri: `http://149.129.252.24/bni/cr8${(process.env.NODE_ENV === 'production') ? '-prod' : ''}.php`,
          method: 'POST',
          json: vaAssets
        });

        termin.paid.payment_id = initCharge.virtual_account;
      }
    } else {
      // get the Virtual Account
      initCharge = await requester({
        uri: `http://149.129.252.24/bni/cr8${(process.env.NODE_ENV === 'production') ? '-prod' : ''}.php`,
        method: 'POST',
        json: vaAssets
      });

      termin.paid.payment_id = initCharge.virtual_account;
    }

    termins.push(termin);
  }

  // return termins;
  return {
    termins: termins,
    voucher: voucher
  }
}

async function checkAutomaticVoucher(data, merchant) {
  const today = moment();
  const voucher = await Voucher.findOne({
    'type': 'automatic',
    'start': {
      '$lte': new Date(today)
    },
    'expired': {
      '$gte': new Date(today)
    },
    'transactionTime.start': {
      '$lte': new Date(today)
    },
    'transactionTime.end': {
      '$gte': new Date(today)
    },
    'minimumTransaction': {
      '$lte': data.total
    },
    '$or': [
      { 'merchants': merchant },
      { 'terms.allMerchants': true }
    ],
    'terms.terminDuration': data.terminDuration
  });

  if (!voucher) return null;

  if (voucher.terms.onlyCanBeUsedOncePerUser) {
    const counter = await ApprovedTransaction.count({ user: data.user, voucher: voucher._id });
    if (counter > 0) return null;
  }

  // if(data.terminDuration == 14) return null;

  if (data.total < voucher.minimumTransaction) return null;

  return voucher;
}

async function giveVoucherForFirstTransaction(user) {
  const approvedTransactionCounter = await ApprovedTransaction.count({ user: user._id });

  if (approvedTransactionCounter == 1 && user.referrer) {
    let voucherCode, accepted = false;

    // if user did not have referral code
    while (!accepted) {
      voucherCode = makeUniqueString(10);
      if (await Voucher.count({ code: voucherCode }) < 1) accepted = true;
    }

    await Voucher.create({
      code: voucherCode,
      deduct: {
        type: 'fix',
        total: 50000
      },
      description: '[System] Referral program',
      start: moment(),
      expired: moment().add(1, 'months'),
      user: user.referrer,
      type: 'private',
      quota: 1,
      remainingQuota: 1,
      affecting: {
        termin: true,
        terminNumber: [4]
      }
    });
  }

  return;
}

function callbackMaker(body, total) {
  let bucket = {
    transaction_id: body.transactionNumber,
    transaction_number: (body.transactionNumber.indexOf('.') > -1) ? body.transactionNumber.substring(body.transactionNumber.indexOf('.') + 1, body.transactionNumber.length) : body.transactionNumber,
    success: true,
    status_code: '200',
    status_message: 'success'
  };

  if (total) bucket.gross_amount = total;
  if (body.redirectURL) bucket.redirectURL = body.redirectURL;
  if (body.voucher) bucket['voucher'] = body.voucher;

  let keys = Object.keys(body);

  let counter = 0;

  for (let i = 0; i < keys.length; i++) {
    if (counter < 5) {
      if (keys[i] !== 'transactionNumber' && keys[i] !== 'total' && keys[i] !== 'amount' && keys[i] !== 'store' && keys[i] !== 'md5' && keys[i] !== 'token' && keys[i] !== 'terminDuration' && keys[i] !== 'convenienceFee' && keys[i] !== 'voucher' && keys[i] !== 'failedURL' && keys[i] !== 'PGProvider') {
        bucket[keys[i]] = body[keys[i]];
        ++counter;
      }
    }
  }

  return bucket;
}

function callbackMakerAdv(transactionNumber, body, remainingCredit, userId) {
  let bucket = {
    transaction_id: transactionNumber,
    transaction_number: (transactionNumber.indexOf('.') > -1) ? transactionNumber.substring(transactionNumber.indexOf('.') + 1, transactionNumber.length) : transactionNumber,
    success: true,
    status_code: '200',
    status_message: 'success'
  };

  if (remainingCredit) bucket.remainingCredit = remainingCredit;
  if (userId) bucket.userId = userId;
  if (body.total) bucket.gross_amount = body.total;
  if (body.redirectURL) bucket.redirectURL = body.redirectURL;
  if (body.convenienceFee) bucket.convenienceFee = body.convenienceFee;
  if (body.terminDuration) bucket.terminDuration = body.terminDuration;

  let keys = Object.keys(body);

  let counter = 0;

  for (let i = 0; i < keys.length; i++) {
    if (counter < 5) {
      if (keys[i] !== 'transactionNumber' && keys[i] !== 'total' && keys[i] !== 'amount' && keys[i] !== 'store' && keys[i] !== 'md5' && keys[i] !== 'token' && keys[i] !== 'terminDuration' && keys[i] !== 'convenienceFee' && keys[i] !== 'voucher' && keys[i] !== 'failedURL' && keys[i] !== 'PGProvider') {
        bucket[keys[i]] = body[keys[i]];
        ++counter;
      }
    }
  }

  return bucket;
}

function prefixMaker(p, exists) {
  let result = '';
  const prefix = p.split(' ').join('');

  if (exists) {
    result += prefix.substr(0, 2).toUpperCase();
    result += makeUniqueString(3).toUpperCase();
  } else {
    result += prefix.substr(0, 5).toUpperCase();
    if (prefix.length < 5) result += makeUniqueString(5 - prefix.length).toUpperCase();
  }

  return result;
}



module.exports = {
  callbackMakerAdv,
  broadcaster,
  requester,
  requesterV2,
  createTermin,
  checkAutomaticVoucher,
  giveVoucherForFirstTransaction,
  callbackMaker,
  callbackMakerAdv,
  prefixMaker
}