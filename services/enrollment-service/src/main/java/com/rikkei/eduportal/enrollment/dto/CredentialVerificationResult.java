package com.rikkei.eduportal.enrollment.dto;

public class CredentialVerificationResult {
    private boolean valid;
    private String serial;
    private String message;
    private DigitalCredentialDto credential;
    private String verifiedAt;

    public CredentialVerificationResult() {}

    public CredentialVerificationResult(boolean valid, String serial, String message,
                                       DigitalCredentialDto credential, String verifiedAt) {
        this.valid = valid;
        this.serial = serial;
        this.message = message;
        this.credential = credential;
        this.verifiedAt = verifiedAt;
    }

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }

    public String getSerial() { return serial; }
    public void setSerial(String serial) { this.serial = serial; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public DigitalCredentialDto getCredential() { return credential; }
    public void setCredential(DigitalCredentialDto credential) { this.credential = credential; }

    public String getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(String verifiedAt) { this.verifiedAt = verifiedAt; }
}
