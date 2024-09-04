import { IUser } from "../../entities/UsersEntity";
import { OtpUser } from "../../entities/UsersOtp";

export interface IOtpUserRepository{
    createOtp(otpData: Partial<OtpUser>): Promise<void>
    findOtpByEmail(email: string): Promise<OtpUser | null>
    updateOtpStatus(email: string): Promise<void>
    findUserByEmail(email: string): Promise<IUser | null>
    markUserAsVerified(email: string): Promise<void>
}
    