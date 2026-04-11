import { Message } from "../models/Message.model";

const sendMessage = async(req,res,next) => {
    try {
        const {ChannelSplitterNode, content} = req.body;

        if(!content){
            return res.status(400).json(
                {
                    message: "Message content required"
                }
            )
        }

        const message = await Message.create(
            {
                channelId,
                senderId: req.user.id,
                content,
            }
        );

        res.status(201).json(message)
    } catch (error) {
        next(error)
    }
}


const getChannelMessages = async(req, res, next) => {
    try {
        const {channelId} = req.params;

        const messages = await Message.find({channelId}).populate("senderId", "username avatar")

        res.json(messages)
    } catch (error) {
        next(error)
    }
}

const deleteMessage = async (req, res, next) => {
    try {
         const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // only sender can delete
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await message.deleteOne();
    res.json({ message: "Message deleted" });
    } catch (error) {
        next(error)
    }
}

export {
    sendMessage,
    getChannelMessages,
    deleteMessage
}