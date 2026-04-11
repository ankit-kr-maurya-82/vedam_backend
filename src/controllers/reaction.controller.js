import { Message } from "../models/Message.model.js";

/**
 * @desc    Toggle reaction on message
 * @route   POST /api/reactions
 * @access  Private
 */

const toggleReaction = async(req,res,next) => {
    try {
        
        const { messageId, emoji } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(messageId)

        if(!message){
            return res.status(404).json(
                {
                    message: "Message not found"
                }
            )
        }

        let reaction = message.reactions.find((r) => r.emoji === emoji);

         if (!reaction) {
      // add new reaction
      message.reactions.push({
        emoji,
        users: [userId],
      });
    } else {
      const hasReacted = reaction.users.includes(userId);

      if(hasReacted){
        // remove user reaction
        reaction.users.pull(userId);

        // remove emoji if no users left
        if(reaction.users.length === 0) {
          message.reactions = message.reactions.filter(
            (r) => r.emoji !== emoji
          );
        }
      } else {
        reaction.users.push(userId);
      }
    }

    await message.save();

    res.json({
      messageId,
      reactions: message.reactions,
    });




    } catch (error) {
        next(error)
    }
}

export {
    toggleReaction
}