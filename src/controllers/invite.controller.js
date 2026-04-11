import { Invite } from "../models/Invite.model.js";
import { Server } from "../models/server.model.js";
import { generateInviteCode } from "../utils/generateInviteCode.js"


/**
 * @desc    Create invite link
 * @route   POST /api/invites
 * @access  Private (ADMIN / OWNER)
 */

const createInvite = async(req,res,next)=> {
    try {

        const {serverId, expiresIn, maxUses} = req.body;

        const server = await Server.findById(serverId);
        if(!server){
            return res.status(404).json(
                {
                    message: "Server not found"
                }
            )
        }

        const member = server.members.find((e) => e.userId.toString() === req.user.id)

        if(!["OWNER", "ADMIN"].includes(member?.roles)){
            return res.status(403).json(
                {
                    message: "Permission denied"
                }
            )
        }

        const invite = await Invite.create(
            {
                serverId,
                code: generateInviteCode(),
                createdBy: req.user.id,
                expiresAt: expiresIn? new Date(Date.now() + expiresIn * 60 * 1000): null,maxUses: maxUses || 0
            }
        )

        res.status(201).json(
            {
                inviteLink: `${process.env.CLIENT_URL}/invite/${invite.code}`, invite
            }
        )

    } catch (error) {
        next(error)
    }
}


/**
 * @desc    Join server via invite
 * @route   POST /api/invites/:code
 * @access  Private
 */


const joinViaInvite = async(req,res,next)=> {
    try {
        const invite = await Invite.findOne({
            code: req.params.code
        })


        if(!invite){
            return res.status(404).json({ message: "Invalid invite link" });
         }

         if(invite.expiresAt && invite.expiresAt < new Date()){
            return res.status(400).json(
                {
                    message: "Invite expired"
                }
            )
         }

         if(invite.maxUses > 0 && invite.uses >= invite.maxUses){
            return res.status(400).json(
                {
                    message: "Invite limit reached"
                }
            )
         }

         const server = await Server.findById(invite.serverId)

         if(!server){
            return res.status(404).json({ message: "Server not found" });

         }

          const exists = server.members.find((m) => m.userId.toString() === req.user.id
    );

    if(exists){
        return res.status(400).json(
            {
                message: "Already a member"
            }
        )
    }

    server.members.push(
        {
            userId: req.user.id,
            role: "MEMBER",
        }
    )

    invite.uses +=1;

    await server.save();
    await invite.save();

    res.json(
        {
            message: "Joined server successfully",
            serverId: server._id
        }
    )


    } catch (error) {
        next(error)
    }
}


export {
    createInvite,
    joinViaInvite
}