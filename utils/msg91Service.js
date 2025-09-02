const https = require('https');

class MSG91Service {
  constructor() {
    this.baseUrl = 'control.msg91.com';
    this.authKey = process.env.MSG91_AUTH_KEY || '463475A3KDEZ6xSY6893704cP1';
    this.templateId = process.env.MSG91_TEMPLATE_ID || '68a993e86b326a2b850604a8';
  }

  // Generate random OTP
  generateOTP(length = 6) {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  }

  // Send OTP via SMS
  async sendOTP(phoneNumber, otpExpiry = 10) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp?mobile=91${phoneNumber}&authkey=${this.authKey}&otp_expiry=${otpExpiry}&otp_length=6&template_id=${this.templateId}&realTimeResponse=1`,
        headers: {
          'content-type': 'application/json',
          'Content-Type': 'application/JSON'
        }
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            if (response.type === 'success') {
              resolve({ success: true, messageId: response.request_id });
            } else {
              reject(new Error(response.message || 'Failed to send OTP'));
            }
          } catch (error) {
            reject(new Error('Invalid response from MSG91'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      // Send empty body as required by MSG91
      req.write('{}');
      req.end();
    });
  }

  // Resend OTP via voice
  async resendOTPVoice(phoneNumber) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp/retry?mobile=91${phoneNumber}&authkey=${this.authKey}&retrytype=voice`,
        headers: {}
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            if (response.type === 'success') {
              resolve({ success: true, message: 'OTP sent via voice call' });
            } else {
              reject(new Error(response.message || 'Failed to resend OTP via voice'));
            }
          } catch (error) {
            reject(new Error('Invalid response from MSG91'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  // Resend OTP via text
  async resendOTPText(phoneNumber) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp/retry?mobile=91${phoneNumber}&authkey=${this.authKey}&retrytype=text`,
        headers: {}
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            if (response.type === 'success') {
              resolve({ success: true, message: 'OTP sent via SMS' });
            } else {
              reject(new Error(response.message || 'Failed to resend OTP via SMS'));
            }
          } catch (error) {
            reject(new Error('Invalid response from MSG91'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  // Verify OTP
  async verifyOTP(phoneNumber, otp) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: this.baseUrl,
        port: null,
        path: `/api/v5/otp/verify?otp=${otp}&mobile=91${phoneNumber}`,
        headers: {
          authkey: this.authKey
        }
      };

      const req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = JSON.parse(body.toString());
            
            if (response.type === 'success') {
              resolve({ success: true, message: 'OTP verified successfully' });
            } else {
              reject(new Error(response.message || 'Invalid OTP'));
            }
          } catch (error) {
            reject(new Error('Invalid response from MSG91'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }
}

module.exports = new MSG91Service();
