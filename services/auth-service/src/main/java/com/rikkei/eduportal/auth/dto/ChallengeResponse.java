package com.rikkei.eduportal.auth.dto;

public class ChallengeResponse {

    private String challengeToken;
    private String nonce;
    private int difficulty;
    private long expiresAt;

    public ChallengeResponse() {}

    public ChallengeResponse(String challengeToken, String nonce, int difficulty, long expiresAt) {
        this.challengeToken = challengeToken;
        this.nonce = nonce;
        this.difficulty = difficulty;
        this.expiresAt = expiresAt;
    }

    public String getChallengeToken() {
        return challengeToken;
    }

    public void setChallengeToken(String challengeToken) {
        this.challengeToken = challengeToken;
    }

    public String getNonce() {
        return nonce;
    }

    public void setNonce(String nonce) {
        this.nonce = nonce;
    }

    public int getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(int difficulty) {
        this.difficulty = difficulty;
    }

    public long getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(long expiresAt) {
        this.expiresAt = expiresAt;
    }
}
