const config = require('../../config/config');
const amqplib = require('amqplib');

/**
 * Class representing AMQP Connection
 */
class AMQPConnection {
  constructor(cb) {
    this.conn = amqplib.connect({
      protocol: config.amqp.protocol,
      hostname: config.amqp.hostname,
      port: config.amqp.port,
      username: config.amqp.username,
      password: config.amqp.password
    });
  }

  sendMessage(channelName, message){
    this.conn.then(conn => {
      const ok = conn.createChannel();
      if(!ok) return false;

      ok.then(ch => {
        ch.assertQueue(channelName, { durable: false });
        ch.sendToQueue(channelName, Buffer.from(message));
        console.log('- Sent', message);

        console.log('CLASS CALLED');
      });
    });
  }
}


module.exports = AMQPConnection;
