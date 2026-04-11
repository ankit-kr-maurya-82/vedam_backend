import { Channel } from "../models/Channel.model";


const createChannel = async(req,res,next) => {
    try {
        const {name, serverId, type} = req.body;

        if(!name || !serverId){
            return res.status(400)
            .json(
                {
                    message: "Name & serverId required"
                }
            )
        }

        const channel = await Channel.create({
            name,
            serverId,
            type: type || "text",
            createdBy: req.user.id,
        });
        res.status(201).json(channel);
    } catch (error) {
        next(error)
    }
}

const getServerChannels = async(req,res,next) => {
    try {
        const {serverId} = req.params;

        const channels = await Channel.find({serverId}).toSorted({createdAt: 1});

        res.json(channels);
    } catch (error) {
        next(error)
    }
}


const updateChannel = async (req,res, next) => {
    try {
        const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    // basic ownership check (can extend to roles later)
    if (channel.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    channel.name = req.body.name || channel.name;
    channel.type = req.body.type || channel.type;

    await channel.save();
    res.json(channel);

    } catch (error) {
        next(error)
    }
}

const deleteChannel = async(req,res,next)=> {
    try {
        const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.createdBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await channel.deleteOne();
    res.json({ message: "Channel deleted" });
    } catch (error) {
        next(error)
    }
}

export {
    createChannel,
    getServerChannels,
    updateChannel,
    deleteChannel
}