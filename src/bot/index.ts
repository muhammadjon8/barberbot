import { Telegraf, Context, Markup } from "telegraf";
import dotenv from "dotenv";
import { User } from "../schemas/user";
import { ServicePrices, ServiceType } from "../types/service-type";
import { Order } from "../schemas/order";
import { Types } from "mongoose";

dotenv.config();

const bot = new Telegraf<Context>(process.env.BOT_TOKEN!);

const tempData: Record<number, { fullName?: string }> = {};
const userSession: Record<
  number,
  {
    serviceType?: ServiceType;
    serviceDate?: string;
    serviceTime?: string;
    awaitingDate?: boolean;
    awaitingTime?: boolean;
  }
> = {};
bot.command("oldschool", (ctx) => ctx.reply("Hello"));

bot.command("buyurtma", async (ctx) => {
  ctx.reply("📅 Bron qilish uchun quyidagi tugmani bosing:");
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await User.findOne({ telegramId });
  if (!user)
    return ctx.reply(
      "❌ Siz ro'yhatdan o'tmagansiz. Iltimos /start ni bosing."
    );

  userSession[telegramId] = {};

  const serviceButtons = Object.values(ServiceType).map((service) => {
    return [
      Markup.button.callback(
        `${service} - ${ServicePrices[service]} so'm`,
        service
      ),
    ];
  });

  ctx.reply(
    "📋 Xizmat turini tanlang: ",
    Markup.inlineKeyboard(serviceButtons)
  );
});
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const existingUser = await User.findOne({ telegramId });

  if (existingUser) {
    return ctx.reply(
      `Xush Kelibsiz, ${existingUser.fullName}! 🎉`,
      Markup.inlineKeyboard([
        Markup.button.webApp("📅 Bron qilish", process.env.WEB_APP_URL!),
      ])
    );
  }

  tempData[telegramId] = {};
  ctx.reply("Assalomu alaykum! 👋 To'lqi ismingizni kiriting");
});

bot.on("text", async (ctx) => {
  const telegramId = ctx.from?.id;
  const text = ctx.message.text;
  if (!telegramId) return;

  // Handle registration process
  if (tempData[telegramId] && !tempData[telegramId].fullName) {
    tempData[telegramId].fullName = text;

    return ctx.reply(
      "Ajoyib! Endi pastdagi tugma orqali raqamingizni jo'nating:",
      Markup.keyboard([
        Markup.button.contactRequest("📱 Raqamingizni yuboring"),
      ])
        .oneTime()
        .resize()
    );
  }

  // In the text handler where we ask for the date
  if (userSession[telegramId] && userSession[telegramId].awaitingDate) {
    // Check if the date format is valid (MM-DD)
    const dateFormatRegex = /^(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])$/;
    if (!dateFormatRegex.test(text)) {
      return ctx.reply(
        "❌ Noto'g'ri format! Iltimos sanani MM-DD formatida kiriting (masalan: 04-26)"
      );
    }

    // Add the current year to the date for processing
    const currentYear = new Date().getFullYear();
    const [month, day] = text.split("-").map((num) => parseInt(num, 10));

    // Create a date object for validation
    const selectedDate = new Date(currentYear, month - 1, day); // Month is 0-indexed in JS Date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today

    // If the date is earlier than today, reject it
    if (selectedDate < today) {
      return ctx.reply(
        "❌ O'tgan sanani tanlay olmaysiz. Iltimos bugungi yoki kelgusi sanani tanlang."
      );
    }

    // Store the full date in YYYY-MM-DD format
    const formattedMonth = month.toString().padStart(2, "0");
    const formattedDay = day.toString().padStart(2, "0");
    userSession[
      telegramId
    ].serviceDate = `${currentYear}-${formattedMonth}-${formattedDay}`;

    userSession[telegramId].awaitingDate = false;
    userSession[telegramId].awaitingTime = true;

    let timeOptions = [
      [
        Markup.button.callback("09:00", "09:00"),
        Markup.button.callback("10:00", "10:00"),
      ],
      [
        Markup.button.callback("11:00", "11:00"),
        Markup.button.callback("12:00", "12:00"),
      ],
      [
        Markup.button.callback("14:00", "14:00"),
        Markup.button.callback("15:00", "15:00"),
      ],
      [
        Markup.button.callback("16:00", "16:00"),
        Markup.button.callback("17:00", "17:00"),
      ],
    ];

    const isToday = selectedDate.toDateString() === today.toDateString();
    if (isToday) {
      const now = new Date();

      timeOptions = timeOptions
        .map((row) =>
          row.filter((button) => {
            const [buttonHour, buttonMinute] = button.text
              .split(":")
              .map(Number);

            const buttonDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              buttonHour,
              buttonMinute
            );

            return buttonDate.getTime() > now.getTime();
          })
        )
        .filter((row) => row.length > 0);

      if (timeOptions.length === 0) {
        return ctx.reply(
          "❌ Bugun uchun bo'sh vaqtlar yo'q. Iltimos, boshqa sanani tanlang.",
          Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Qayta boshla", "restart")],
          ])
        );
      }
    }

    return ctx.reply(
      "⏰ Iltimos, vaqtni tanlang:",
      Markup.inlineKeyboard(timeOptions)
    );
  }

  if (userSession[telegramId] && userSession[telegramId].awaitingTime) {
    const timeFormatRegex = /^\d{1,2}:\d{2}$/;
    if (!timeFormatRegex.test(text)) {
      return ctx.reply(
        "❌ Noto'g'ri format! Iltimos vaqtni HH:MM formatida kiriting (masalan: 14:00)"
      );
    }

    const [enteredHour, enteredMinute] = text.split(":").map(Number);
    const now = new Date();
    const enteredDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      enteredHour,
      enteredMinute
    );

    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    if (
      userSession[telegramId].serviceDate === now.toISOString().split("T")[0]
    ) {
      if (enteredDate.getTime() <= oneHourLater.getTime()) {
        return ctx.reply(
          "❌ Siz kamida 1 soatdan keyin bo'lgan vaqtni tanlashingiz kerak. Iltimos boshqa vaqt kiriting."
        );
      }
    }

    userSession[telegramId].serviceTime = text;
    userSession[telegramId].awaitingTime = false;

    return await createOrder(ctx, telegramId);
  }

});

bot.on("contact", async (ctx) => {
  const contact = ctx.message.contact;
  const telegramId = ctx.from?.id;

  if (!telegramId || !contact || contact.user_id !== telegramId) {
    return ctx.reply("Iltimos o'zingizni telefon raqamingizni jo'nating.");
  }

  const fullName = tempData[telegramId]?.fullName;

  if (!fullName)
    return ctx.reply("Nimadir xato ketdi. Iltimos /start ni bosing.");

  const user = new User({
    telegramId,
    fullName,
    telegramUsername: ctx.from.username,
    phoneNumber: contact.phone_number,
    numberOfBookings: 0,
  });

  await user.save();
  delete tempData[telegramId];

  ctx.reply(
    `🎉 Ro'yhatdan o'tganingiz uchun rahmt, ${fullName}! Endi bron qilishingiz mumkin:`,
    {
      ...Markup.inlineKeyboard([
        Markup.button.webApp("📅 Bron qilish", process.env.WEB_APP_URL!),
      ]),
      ...Markup.removeKeyboard(),
    }
  );
});

// Callback for selecting service type or time
bot.on("callback_query", async (ctx) => {
  const telegramId = ctx.from?.id;
  const data = (ctx.callbackQuery as any)?.data;
  if (!telegramId || !data) return;

  // Initialize session if it doesn't exist
  if (!userSession[telegramId]) {
    userSession[telegramId] = {};
  }

  const session = userSession[telegramId];

  // If service type is selected
  if (Object.values(ServiceType).includes(data as ServiceType)) {
    session.serviceType = data as ServiceType;
    session.awaitingDate = true;
    await ctx.answerCbQuery();

    // Ask for month and day only
    return ctx.reply(
      "🗓 Iltimos, buyurtma uchun sanani kiriting (Format: MM-DD, masalan: 04-26)"
    );
  }
  // If time is selected (match a time format like "09:00")
  else if (
    session.serviceType &&
    session.serviceDate &&
    /^\d{1,2}:\d{2}$/.test(data)
  ) {
    session.serviceTime = data;
    session.awaitingTime = false;
    await ctx.answerCbQuery();

    // Create the order
    return await createOrder(ctx, telegramId);
  } else if (data === "restart") {
    delete userSession[telegramId];
    await ctx.answerCbQuery();

    // Restart the booking process
    const serviceButtons = Object.values(ServiceType).map((service) => {
      return [
        Markup.button.callback(
          `${service} - ${ServicePrices[service]} so'm`,
          service
        ),
      ];
    });

    return ctx.reply(
      "📋 Xizmat turini tanlang: ",
      Markup.inlineKeyboard(serviceButtons)
    );
  }
  // Handle other callback types if needed
  else {
    await ctx.answerCbQuery("Noma'lum so'rov");
    return ctx.reply("❌ Xatolik yuz berdi. Iltimos /buyurtma ni qayta bosing.");
  }
});

// Helper function to create an order
async function createOrder(ctx: Context, telegramId: number) {
  const session = userSession[telegramId];
  if (
    !session ||
    !session.serviceType ||
    !session.serviceDate ||
    !session.serviceTime
  ) {
    return ctx.reply(
      "❌ Yetarli ma'lumot yo'q. Iltimos /buyurtma ni qayta bosing."
    );
  }

  const user = await User.findOne({ telegramId }).exec();
  if (!user) {
    return ctx.reply("❌ Foydalanuvchi topilmadi, iltimos ro'yhatdan o'ting.");
  }

  const order = new Order({
    userId: user._id,
    serviceType: session.serviceType,
    serviceDate: session.serviceDate,
    serviceTime: session.serviceTime,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await order.save();

  user.numberOfBookings += 1;
  await user.save();

  delete userSession[telegramId];

  const message =
    `✅ Buyurtma tasdiqlandi!\n\n` +
    `👤 Mijoz: ${user.fullName}\n` +
    `📱 Telefon: ${user.phoneNumber}\n` +
    `${user.telegramUsername ? `@${user.telegramUsername}\n` : ""}` +
    `\n` +
    `🛎 Xizmat: ${order.serviceType}\n` +
    `🗓 Sana: ${order.serviceDate}\n` +
    `⏰ Vaqt: ${order.serviceTime}\n\n` +
    `Rahmat! 🙌`;

  bot.telegram.sendMessage(process.env.FORWARDING_CHANNEL_ID!, message);
  return ctx.reply(message);
}

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
