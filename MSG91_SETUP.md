# MSG91 OTP Service Setup

This document explains how to set up and use the MSG91 OTP service in the NanoCart backend.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# MSG91 Configuration
MSG91_AUTH_KEY=463475A3KDEZ6xSY6893704cP1
MSG91_TEMPLATE_ID=68a993e86b326a2b850604a8

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
```

## Features

The MSG91 service provides the following functionality:

1. **Send OTP**: Automatically generates and sends 6-digit OTP via SMS
2. **Resend OTP via Voice**: Resend OTP via voice call
3. **Resend OTP via Text**: Resend OTP via SMS
4. **Verify OTP**: Verify the OTP entered by the user

## API Endpoints

### OTP Management
- `POST /auth/otp` - Send OTP to phone number
- `POST /auth/otp/verify` - Verify OTP
- `POST /auth/otp/resend/voice` - Resend OTP via voice call
- `POST /auth/otp/resend/text` - Resend OTP via SMS

### Authentication (OTP-based)
- `POST /auth/signup/otp` - User registration with OTP verification
- `POST /auth/login/otp` - User login with OTP verification

### Authentication (Firebase-based)
- `POST /auth/signup` - User registration with Firebase
- `POST /auth/login` - User login with Firebase

## Usage Examples

### Send OTP
```javascript
const response = await fetch('/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '9337723626' })
});
```

### Verify OTP
```javascript
const response = await fetch('/auth/otp/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    phoneNumber: '9337723626', 
    otp: '123456' 
  })
});
```

### Signup with OTP
```javascript
const response = await fetch('/auth/signup/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    phoneNumber: '9337723626',
    email: 'john@example.com'
  })
});
```

## Security Features

1. **OTP Expiration**: OTPs expire after 10 minutes
2. **Rate Limiting**: Built-in protection against OTP abuse
3. **Secure Storage**: OTPs are stored securely in MongoDB with TTL indexes
4. **Phone Verification**: Users must verify their phone number before registration

## Error Handling

The service includes comprehensive error handling for:
- Invalid phone numbers
- Expired OTPs
- MSG91 API failures
- Database errors
- Validation errors

## Testing

To test the OTP functionality:

1. Use a valid 10-digit phone number
2. The OTP will be sent via MSG91 SMS service
3. Use the received OTP to verify the phone number
4. Complete the registration/login process

## Troubleshooting

### Common Issues

1. **OTP not received**: Check MSG91 account balance and API key
2. **Invalid phone number**: Ensure phone number is 10 digits without country code
3. **OTP expired**: Request a new OTP
4. **API errors**: Check MSG91 service status and credentials

### Support

For MSG91-related issues, contact MSG91 support or check their documentation at https://msg91.com/
