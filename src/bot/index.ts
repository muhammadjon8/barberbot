import { Telegraf, Context, Markup } from "telegraf";
import dotenv from "dotenv";
import { IUser, User } from "../schemas/user";
import { ServicePrices, ServiceType } from "../types/service-type";
import { Order } from "../schemas/order";
import { StatusType } from "../types/order-status-stype";
import { createUniqueOrderCode } from "../utils/generate-order-code";
import { mainMenuKeyboard } from "../constants/main-menu-keyboards";
import { GamificationService } from "../services/gamification.service";
import { UserSession } from "../types/user-session.type";
import { TempData } from "../types/temp-data.type";

dotenv.config();

const bot = new Telegraf<Context>(process.env.BOT_TOKEN!);

const tempData: TempData = {};
const userSession: UserSession = {};

bot.hears("📝 Buyurtma berish", async (ctx) => {
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
bot.hears("🎫Chegirma shartlari", (ctx) => {
  ctx.reply(
    "Chegirma shartlari: Har bir muvaffaqiyatli tugatilgan xizmatdan so'ng sizga 1 ball taqdim etiladi. Qachonki ballaringiz soni 5 taga yetsa, siz 50% chegirmaga ega bo'lasiz.\n\nEslatma: Chegirma avtomatik ravishda keyingi buyurma uchun qo'llaniladi."
  );
});

bot.hears("📍 Manzil", async (ctx) => {
  const barberInfo = {
    name: "Mardon Abduahatov",
    phone: "+998906050021",
    telegramUsername: "bar1ber_1",
    locationName: "Juma shahri, Prokuratura ro'parasi.",
    workingDays: "Dushanbadan Shanbagacha",
    workingHours: "9:00 – 21:00",
    latitude: 39.7109258,
    longitude: 66.6643635,
  };

  const message = `
💈 <b>${barberInfo.name}</b> – bu yerda har bir soch turmagi san'at asariga aylanadi.

📞 <b>Telefon:</b> <a href="tel:${barberInfo.phone}">${barberInfo.phone}</a>
👤 <b>Telegram:</b> <a href="https://t.me/${barberInfo.telegramUsername}">@${barberInfo.telegramUsername}</a>

📍 <b>Manzil:</b>
${barberInfo.locationName}

🗓 <b>Ish kunlari:</b> ${barberInfo.workingDays}
🕙 <b>Ish vaqti:</b> ${barberInfo.workingHours}

Yangi imidj – yangi kayfiyat. Boshqacha boʻlishni xohlaysizmi? Hoziroq yoziling!
  `.trim();

  await ctx.replyWithHTML(message);

  await ctx.replyWithLocation(barberInfo.latitude, barberInfo.longitude);
});

bot.hears("📊 Ballarim", async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = await User.findOne({ telegramId });
  if (!user)
    return ctx.reply(
      "❌ Siz ro'yhatdan o'tmagansiz. Iltimos /start ni bosing."
    );

  const typedUser = user as IUser;
  ctx.reply(await GamificationService.getPointsStatus(typedUser._id as string));
});

bot.hears("📋 Aktiv buyurtmalarim", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return ctx.reply("Foydalanuvchi topilmadi.");

  await ctx.reply("Buyurtmalar yuklanmoqda...");
  const activeOrders = await Order.find({
    userId: user._id,
    status: { $in: [StatusType.Pending, StatusType.Confirmed] },
  }).sort({ createdAt: -1 });

  if (!activeOrders.length)
    return await ctx.reply("Sizda aktiv buyurtmalar yo‘q.");

  const messages = activeOrders.map(
    (order) =>
      `📌 *Buyurtma ID:* ${order.orderCode}\n` +
      `📅 Sana: ${order.serviceDate}\n` +
      `⏰ Vaqt: ${order.serviceTime}\n` +
      `🧰 Xizmat: ${order.serviceType}\n` +
      `📍 Holat: *${order.status}*`
  );

  await ctx.replyWithHTML(messages.join("\n\n"));
});

bot.start(async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const existingUser = await User.findOne({ telegramId });

  if (existingUser) {
    return ctx.reply(
      `Xush Kelibsiz, ${existingUser.fullName}! 🎉\nBron qilish uchun asosiy menyudagi tugmani bosing:`,
      mainMenuKeyboard
    );
  }

  tempData[telegramId] = {};
  ctx.reply("Assalomu alaykum! 👋 To'liq ismingizni kiriting");
});

bot.on("text", async (ctx) => {
  const telegramId = ctx.from.id;
  const text = ctx.message.text;
  const session = userSession[telegramId];

  if (!telegramId) return;

  if (session?.awaitingFeedbackFor) {
    const orderId = session.awaitingFeedbackFor;
    const order = await Order.findById(orderId);
    if (!order) {
      delete userSession[telegramId];
      return ctx.reply("❌ Buyurtma topilmadi.");
    }
    order.feedback = ctx.message.text;
    await order.save();
    const user = await User.findOne({ telegramId });

    if (!user) {
      delete userSession[telegramId];
      return ctx.reply("❌ Foydalanuvchi topilmadi.");
    }
    const message =
      `✅ Buyurtma yaratildi!\n\n` +
      `🆔 Buyurtma ID: ${order.orderCode}\n\n` +
      `👤 Mijoz: ${user.fullName}\n` +
      `📱 Telefon: ${user.phoneNumber}\n` +
      `${user.telegramUsername ? `@${user.telegramUsername}\n` : ""}` +
      `\n` +
      `🛎 Xizmat: ${order.serviceType}\n` +
      `🗓 Sana: ${order.serviceDate}\n` +
      `⏰ Vaqt: ${order.serviceTime}\n` +
      `💵 Narx: ${order.price} so'm\n\n`;
    await bot.telegram.editMessageText(
      process.env.FORWARDING_CHANNEL_ID!,
      order.channelMessageId,
      undefined,
      message +
        `\n✅ Buyurtma yakunlandi va mijoz baholadi:\n\n⭐️ Baho: ${order.rating}/10\n💬 Fikr: ${order.feedback}`
    );

    if (user) {
      user.points = (user.points || 0) + 1;

      if (user.points >= 5) {
        await ctx.reply(
          "🎉 Tabriklaymiz! Siz 5 ta ball to'pladingiz va 50% chegirmaga ega bo'ldingiz! Keyingi buyurtmangizda avtomatik qo'llaniladi."
        );
      } else {
        await ctx.reply(
          `✅ Fikringiz uchun rahmat! Sizda hozircha ${user.points} ball mavjud.`
        );
      }

      await user.save();
    }

    delete userSession[telegramId];
    return;
  }

  // Handle user registration
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

  // Handle date input
  if (session && session.awaitingDate) {
    const dateFormatRegex = /^(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])$/;
    if (!dateFormatRegex.test(text)) {
      return ctx.reply(
        "❌ Noto'g'ri format! Iltimos sanani MM-DD formatida kiriting (masalan: 04-26)"
      );
    }

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
      [
        Markup.button.callback("18:00", "18:00"),
        Markup.button.callback("19:00", "19:00"),
      ],
      [
        Markup.button.callback("20:00", "20:00"),
        Markup.button.callback("21:00", "21:00"),
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

  // Handle manual time input
  if (session && session.awaitingTime) {
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
    mainMenuKeyboard
  );
});

bot.on("callback_query", async (ctx) => {
  const data = (ctx.callbackQuery as any).data;

  if (!data) return;

  const [action, orderId] = data.split(":");

  if (
    [
      "confirm",
      "cancel",
      "complete",
      "complete_yes",
      "complete_cancel",
    ].includes(action)
  ) {
    const order = await Order.findById(orderId).populate("userId");
    if (!order || !order.userId) {
      await ctx.answerCbQuery("❌ Buyurtma topilmadi", { show_alert: true });
      return;
    }

    const user = order.userId as any;

    let userMessage = "";

    switch (action) {
      case "confirm":
        await ctx.answerCbQuery("⏳ Ishongchingiz komilmi?");
        order.status = StatusType.Confirmed;
        await ctx.editMessageReplyMarkup(
          Markup.inlineKeyboard([
            [
              Markup.button.callback("❌ Bekor qilish", `cancel:${order._id}`),
              Markup.button.callback("✔️ Tugatildi", `complete:${order._id}`),
            ],
          ]).reply_markup
        );
        userMessage = `✅ Buyurtmangiz barber tomonidan *tasdiqlandi*.\n\nBuyurtma raqami: ${order.orderCode}\nIltimos, belgilangan vaqtdan *10 daqiqa oldinroq* yetib kelishingizni so'raymiz.`;
        break;

      case "cancel":
        order.status = StatusType.Cancelled;
        order.cancellationReason = "Barber tomonidan bekor qilindi";
        await ctx.editMessageReplyMarkup(
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "Bekor qilingan. Qaytarish uchun bosing",
                `complete_cancel:${order._id}`
              ),
            ],
          ]).reply_markup
        );
        userMessage = `❌ Buyurtmangiz *barber tomonidan bekor qilindi*\nBuyurtma raqami: ${order.orderCode}.`;
        break;

      case "complete":
        await ctx.answerCbQuery("⏳ Ishonchingiz komilmi?");
        await ctx.editMessageReplyMarkup(
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "✅ Ha, yakunlash",
                `complete_yes:${orderId}`
              ),
              Markup.button.callback(
                "❌ Yo'q, bekor qilish",
                `complete_cancel:${orderId}`
              ),
            ],
          ]).reply_markup
        );
        return ctx.answerCbQuery("Yakunlashni tasdiqlaysizmi?");

      case "complete_yes":
        order.status = StatusType.Completed;
        await order.save();

        await bot.telegram.sendMessage(
          user.telegramId,
          `✅ Xizmat barber tomonidan yakunlandi.\nBuyurtma raqami: ${order.orderCode}\n\n*Biz bilan ishlaganingizdan mamnunmiz!* 😊\n\nEndi bizning xizmatimizga ball va izoh qoldirsangiz chegirmaga ega bo'lishingiz mumkin!`,
          { parse_mode: "Markdown" }
        );

        const ratingButtons = Array.from({ length: 10 }, (_, i) =>
          Markup.button.callback(`${i + 1}`, `rate_${order._id}_${i + 1}`)
        );

        const ratingKeyboard = Markup.inlineKeyboard([
          ratingButtons.slice(0, 5),
          ratingButtons.slice(5),
        ]);

        const sentRatingMessage = await bot.telegram.sendMessage(
          user.telegramId,
          "📊 Iltimos, ushbu xizmatga nechchi ball berasiz? (1–10)",
          ratingKeyboard
        );
        userSession[user.telegramId] = {
          ...userSession[user.telegramId],
          awaitingRatingFor: order._id as string,
          ratingMessageId: sentRatingMessage.message_id,
        };
        await ctx.editMessageReplyMarkup(undefined);
        return;

      case "complete_cancel":
        await ctx.answerCbQuery("⏳ Qaytarildi");
        await ctx.editMessageReplyMarkup(
          Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Tasdiqlash", `confirm:${order._id}`),
              Markup.button.callback("❌ Bekor qilish", `cancel:${order._id}`),
            ],
            [Markup.button.callback("✔️ Tugatildi", `complete:${order._id}`)],
          ]).reply_markup
        );
        return ctx.answerCbQuery("Bekor qilindi.");
    }

    await order.save();
    await bot.telegram.sendMessage(user.telegramId, userMessage, {
      parse_mode: "Markdown",
    });

    await ctx.answerCbQuery("✅ Holat yangilandi");
    return;
  }
  if (action.startsWith("rate")) {
    const [, orderId, ratingStr] = action.split("_");
    const rating = parseInt(ratingStr);

    const order = await Order.findById(orderId);
    if (!order) {
      return ctx.answerCbQuery("❌ Buyurtma topilmadi");
    }

    if (order.rating) {
      return ctx.answerCbQuery("❗ Siz allaqachon baholagansiz.");
    }

    order.rating = rating;
    await order.save();

    const session = userSession[ctx.from.id];
    if (session?.ratingMessageId) {
      await bot.telegram.editMessageReplyMarkup(
        ctx.from.id,
        session.ratingMessageId,
        undefined,
        undefined
      );
    }

    await ctx.answerCbQuery("✅ Baholadingiz, rahmat!");

    await ctx.reply(
      "✍️ Iltimos, ushbu xizmat haqida fikringizni yozib qoldiring:"
    );

    userSession[ctx.from.id] = {
      ...userSession[ctx.from.id],
      awaitingFeedbackFor: orderId,
      ratingMessageId: undefined,
    };

    return;
  }

  const telegramId = ctx.from?.id;
  if (!telegramId || !data) return;

  if (!userSession[telegramId]) {
    userSession[telegramId] = {};
  }

  const session = userSession[telegramId];

  if (Object.values(ServiceType).includes(data as ServiceType)) {
    session.serviceType = data as ServiceType;
    session.awaitingDate = true;
    await ctx.answerCbQuery();

    return ctx.reply(
      `Siz ${data} xizmatini tanladingiz.\n\n🗓 Iltimos, buyurtma uchun sanani kiriting (Format: OY-KUN, masalan: 04-26)`
    );
  } else if (
    session.serviceType &&
    session.serviceDate &&
    /^\d{1,2}:\d{2}$/.test(data)
  ) {
    session.serviceTime = data;
    session.awaitingTime = false;
    await ctx.answerCbQuery();

    // Create the order
    return await createOrder(ctx, telegramId);
  } else {
    await ctx.answerCbQuery("Noma'lum so'rov");
    return ctx.reply(
      "❌ Xatolik yuz berdi. Iltimos asosiy menyudan tanlang.",
      mainMenuKeyboard
    );
  }
});

async function createOrder(ctx: Context, telegramId: number) {
  const session = userSession[telegramId];
  if (
    !session ||
    !session.serviceType ||
    !session.serviceDate ||
    !session.serviceTime
  ) {
    return ctx.reply(
      "❌ Yetarli ma'lumot yo'q. Iltimos asosiy menyudan tanlang"
    );
  }

  const user = await User.findOne({ telegramId }).exec();
  if (!user) {
    return ctx.reply("❌ Foydalanuvchi topilmadi, iltimos ro'yhatdan o'ting.");
  }
  const typedUser = user as IUser & { _id: any };
  const userId = typedUser._id.toString();

  const existingOrder = await Order.findOne({
    serviceDate: session.serviceDate,
    serviceTime: session.serviceTime,
    status: { $ne: StatusType.Cancelled },
  });

  if (existingOrder) {
    return ctx.reply(
      "❌ Afsuski, bu vaqt band qilingan. Iltimos boshqa vaqt tanlang."
    );
  }

  const order = new Order({
    userId,
    serviceType: session.serviceType,
    serviceDate: session.serviceDate,
    serviceTime: session.serviceTime,
    orderCode: await createUniqueOrderCode(),
    status: StatusType.Pending,
    price: ServicePrices[session.serviceType],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const { finalPrice, discountUsed } = await GamificationService.applyDiscount(
    userId,
    ServicePrices[order.serviceType]
  );
  order.price = finalPrice;

  let discountMessage = "";
  if (discountUsed) {
    discountMessage = "\n\n🎁 50% chegirma qo‘llandi\n";
  }

  await order.save();
  delete userSession[telegramId];

  const message =
    `✅ Buyurtma yaratildi!\n\n` +
    `🆔 Buyurtma ID: ${order.orderCode}\n\n` +
    `👤 Mijoz: ${user.fullName}\n` +
    `📱 Telefon: ${user.phoneNumber}\n` +
    `${user.telegramUsername ? `@${user.telegramUsername}\n` : ""}` +
    `\n` +
    `🛎 Xizmat: ${order.serviceType}\n` +
    `🗓 Sana: ${order.serviceDate}\n` +
    `⏰ Vaqt: ${order.serviceTime}\n` +
    `💵 Narx: ${finalPrice} so'm\n\n`;

  const userMessage = `Buyurtma barberga yuborildi, tasdiqlanishini kuting.`;

  const sentMessage = await bot.telegram.sendMessage(
    process.env.FORWARDING_CHANNEL_ID!,
    message + discountMessage,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ Tasdiqlash", `confirm:${order._id}`),
        Markup.button.callback("❌ Bekor qilish", `cancel:${order._id}`),
      ],
      [Markup.button.callback("✔️ Tugatildi", `complete:${order._id}`)],
    ])
  );
  const channelMessageId = sentMessage.message_id;
  order.channelMessageId = channelMessageId;
  await order.save();

  return ctx.reply(message + userMessage + discountMessage, mainMenuKeyboard);
}

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
