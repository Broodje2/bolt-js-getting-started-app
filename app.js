require("dotenv").config();
const { App } = require("@slack/bolt");

/**
 * This sample slack application uses SocketMode.
 * For the companion getting started setup guide, see:
 * https://tools.slack.dev/bolt-js/getting-started/
 */

// Initializes your app with your bot token and app token
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.command("/getuser", async ({ ack, body, say }) => {
  await ack();

  try {
    const userId = body.user_id;
    const response = await fetch(`http://127.0.0.1:3000/user/${userId}`);
    const data = await response.json();

    await say(`Username van ${userId}: ${data.username}`);
  } catch (error) {
    console.error(error);
    await say("Kon de user niet ophalen 😿");
  }
});

app.command("/registeraccount", async ({ ack, body, say }) => {
  await ack();
  const username = body.user_name;
  const userId = body.user_id;
  console.log(`Registering account for ${username} with ID ${userId}`);

  try {
    // console.log('Sending account registration request...');
    const response = await fetch(`http://127.0.0.1:3000/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slack_name: username, slack_id: userId }),
    });

    if (response.ok) {
      await say(`Account voor ${username} is toegevoegd! 🎉`);
    } else {
      await say(`Kon het account voor ${username} niet toevoegen. 😿`);
    }
  } catch (error) {
    console.error(error);
    // await say("Er is een fout opgetreden bij het toevoegen van het account. 😿");
    await say(`${error}`);
  }
});

// Listens to incoming messages that contain "hello"
app.message("hello", async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Hey there <@${message.user}>!`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Click Me",
          },
          action_id: "button_click",
        },
      },
    ],
    text: `Hey there <@${message.user}>!`,
  });
});

app.action("button_click", async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

app.command("/help", async ({ ack, say }) => {
  await ack();

  await say({
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "*All the commands*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "_Here's a list of all available commands and what they do:_",
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*• `/kudo`* - Send kudos to a teammates",
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*• `/leaderboard`* - Check the leaderboard",
        },
      },
    ],
  });
});

app.command("/givekudos", async ({ ack, body, client }) => {
  await ack();

  // Open a modal
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "give_kudos_modal",
      title: { type: "plain_text", text: "Give someone kudos" },
      submit: { type: "plain_text", text: "Share" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "doer_of_good_deeds_block",
          label: {
            type: "plain_text",
            text: "Whose deeds are deemed worthy of a kudo?",
          },
          element: {
            type: "users_select",
            action_id: "doer_of_good_deeds",
            initial_user: "U09JQCAF8AV",
          },
        },
        {
          type: "input",
          block_id: "kudo_channel_block",
          label: {
            type: "plain_text",
            text: "Where should this message be shared?",
          },
          element: {
            type: "conversations_select",
            action_id: "kudo_channel",
            initial_conversation: "C09K5NA0PNU",
          },
        },
        {
          type: "input",
          block_id: "kudo_amount_block",
          label: {
            type: "plain_text",
            text: "How many kudos do you want to give?",
          },
          element: {
            type: "plain_text_input",
            action_id: "kudo_points",
            multiline: true,
            initial_value: "1",
          },
        },
        {
          type: "input",
          block_id: "kudo_message_block",
          label: { type: "plain_text", text: "What would you like to say?" },
          element: {
            type: "plain_text_input",
            action_id: "kudo_message",
            multiline: true,
            initial_value: "Test",
          },
        },
      ],
    },
  });
});

// Handle modal submission
app.view("give_kudos_modal", async ({ ack, body, view, client }) => {
  await ack();

  const destination_id =
    view.state.values.doer_of_good_deeds_block.doer_of_good_deeds.selected_user;
  const channel =
    view.state.values.kudo_channel_block.kudo_channel.selected_conversation;
  const reason = view.state.values.kudo_message_block.kudo_message.value;
  const amount = view.state.values.kudo_amount_block.kudo_points.value;
  const origin_id = body.user.id;

  try {
    // console.log('Sending account registration request...');
    const response = await fetch(`http://127.0.0.1:3000/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin_slack_id: origin_id,
        origin_kudos_type: "giveaway",
        destination_slack_id: destination_id,
        destination_kudos_type: "kudos",
        amount: amount,
        reason: reason,
      }),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log(
        `Transaction of ${amount} kudos from ${origin_id} to ${destination_id} recorded.`
      );
      await client.chat.postMessage({
        channel: channel,
        text: `🎉 *Kudos!* 🎉\n<@${destination_id}> has received ${amount} kudo(s) from <@${origin_id}> \n Reason: ${reason}\n`,
      });
    } else {
      console.error(`Failed: ${response.status} - ${responseData.error}`);
      await client.chat.postMessage({
        channel: channel,
        text: `Kon de transactie niet uitvoeren: ${
          responseData.error || "Onbekende fout"
        } 😿`,
      });
    }
  } catch (error) {
    console.error(error);
    await client.chat.postMessage({
      channel: channel,
      text: `Er is een fout opgetreden bij het uitvoeren van de transactie. 😿`,
    });
  }
});

app.command("/leaderboard", async ({ ack, body, client, say }) => {
  await ack();

  try {
      // const userInfo = await client.users.info({ user: user.slack_id });
      // const username = userInfo.user.profile.display_name || userInfo.user.name;
      // await say(`*• ${username}*\n Kudos: ${user.total_kudos}`);

    const response = await fetch(`http://127.0.0.1:3000/leaderboard`);
    const data = await response.json();

    const now = new Date();
    const toLocaleDateString = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    await say({
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          //  text: `Hey there <@${message.user}>!`,
          text: `Leaderboard 🏆 - ${toLocaleDateString}`,
        }
      },
      { type: "divider" },
    ]
    });
    // await say(`Leaderboard:`);
    for (let i = 0; i < data.length; i++) {
      const userInfo = await client.users.info({ user: data[i].slack_id });
      console.log(userInfo);
      const username = userInfo.user.profile.display_name || userInfo.user.name;
      await say(`${username} - Kudos: ${data[i].total_kudos}`);
    }
  } catch (error) {
    console.error(error);
    await say("Kon de user niet ophalen 😿");
  }
});

app.event("member_joined_channel", async ({ event, client }) => {
  try {
    const botUserId = (await client.auth.test()).user_id;
    const channelId = event.channel;
    const joinedUserId = event.user;

    // 🧠 Check: bot of gewone gebruiker?
    if (joinedUserId === botUserId) {
      // 🤖 BOT zelf is toegevoegd → sync alle channelleden
      console.log(`🤖 Bot joined channel ${channelId}, syncing all members...`);

      const membersResult = await client.conversations.members({
        channel: channelId,
      });
      const memberIds = membersResult.members;
      console.log(`Found ${memberIds.length} members in channel ${channelId}`);
      array.forEach((memberIds) => {
        console.log(memberIds);
      });

      for (const slack_id of memberIds) {
        const userInfo = await client.users.info({ user: slack_id });
        const slack_name =
          userInfo.user.profile.display_name || userInfo.user.name;

        // Skip bot zelf
        if (slack_id === botUserId) continue;

        await fetch("http://127.0.0.1:3000/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slack_name, slack_id }),
        });
      }

      await client.chat.postMessage({
        channel: channelId,
        text: `✅ Alle leden van dit kanaal zijn toegevoegd aan de database.`,
      });
    } else {
      // 👤 Gewone gebruiker is toegevoegd → voeg enkel die user toe
      const userInfo = await client.users.info({ user: joinedUserId });
      const slack_name =
        userInfo.user.profile.display_name || userInfo.user.name;
      const slack_id = joinedUserId;

      const response = await fetch("http://127.0.0.1:3000/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slack_name, slack_id }),
      });

      if (response.ok) {
        console.log(`✅ Added user ${slack_name} (${slack_id})`);
        await client.chat.postMessage({
          channel: channelId,
          text: `🎉 Welkom <@${slack_id}>! Je account is toegevoegd.`,
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Kon ${slack_name} niet toevoegen: ${errorText}`);
      }
    }
  } catch (error) {
    console.error("⚠️ Error in member_joined_channel:", error);
  }
});

app.command("/sync", async ({ ack, body, client }) => {
  await ack();

  try {
    const botUserId = (await client.auth.test()).user_id;
    const channelId = body.channel_id;

    console.log(`🔄 Syncing all members in channel ${channelId}...`);

    // Haal alle leden van het kanaal
    const membersResult = await client.conversations.members({
      channel: channelId,
    });
    const memberIds = membersResult.members;
    console.log(`Found ${memberIds.length} members in channel ${channelId}`);
    console.log(memberIds);
    for (const userId of memberIds) {
      // Skip bot zelf
      if (userId === botUserId) continue;

      const userInfo = await client.users.info({ user: userId });
      const username = userInfo.user.profile.display_name || userInfo.user.name;

      console.log(`Syncing user: ${username} (${userId})`);

      try {
        await fetch("http://127.0.0.1:3000/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // body: JSON.stringify({ slack_name, slack_id }),
          body: JSON.stringify({ slack_name: username, slack_id: userId }),
        });
        console.log(`✅ Synced ${slack_name} (${userId})`);
      } catch (err) {
        console.error(`❌ Failed to sync ${username} (${userId}):`, err);
      }
    }

    await client.chat.postMessage({
      channel: channelId,
      text: `✅ Alle leden van dit kanaal zijn gesynchroniseerd met de database.`,
    });
  } catch (error) {
    console.error("⚠️ Error in /sync command:", error);
    await client.chat.postMessage({
      channel: body.channel_id,
      text: `❌ Er is een fout opgetreden tijdens het synchroniseren. ${error.message}`,
    });
  }
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  app.logger.info("⚡️ Bolt app is running!");
})();
