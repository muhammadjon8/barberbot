import { User } from "../schemas/user";

export class GamificationService {
  static async rewardUser(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.points = (user.points || 0) + 1;

    let rewardMessage = "✅ Fikringiz uchun rahmat! Sizga 1 ball berildi.";

    if (user.points >= 5 && !user.hasDiscount) {
      user.hasDiscount = true;
      rewardMessage +=
        "\n🎉 Siz 5 ball to‘pladingiz! Endi bir xizmatga 50% chegirma olasiz!";
    }

    await user.save();
    return rewardMessage;
  }

  static async applyDiscount(
    userId: string,
    price: number
  ): Promise<{ finalPrice: number; discountUsed: boolean }> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    if (user.points >= 5) {
      user.points -= 5;
      user.hasDiscount = false;
      await user.save();
      return { finalPrice: price / 2, discountUsed: true };
    }

    return { finalPrice: price, discountUsed: false };
  }

  static async getPointsStatus(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    return `📊 Sizda ${user.points} ta ball mavjud.\n${
      user.hasDiscount ? "🎁 Sizda bitta 50% chegirma mavjud!" : ""
    }`;
  }
}
