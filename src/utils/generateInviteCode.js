import crypt from "crypto"

export const generateInviteCode = () => {
    return crypto.randomBytes(4).toString("hex");
}