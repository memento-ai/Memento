// Path: packages/memento-db/src/mementoDb-addConvXchg.ts

import { addMementoWithConn } from "@memento-ai/postgres-db";
import { Mem, createMem, ConversationMetaArgs, CONV, USER, ASSISTANT, ConvExchangeMetaArgs, XCHG } from "@memento-ai/types";
import { nanoid } from "nanoid";
import { zodParse } from "@memento-ai/utils";
import debug from "debug";
import type { AddConvExchangeArgs } from "./mementoDb-types";
import type { DatabasePool } from "slonik";
import type { ID } from "@memento-ai/postgres-db";

const dlog = debug("mementoDb:mems");

export async function addConvExchangeMementos(pool: DatabasePool, args_: AddConvExchangeArgs): Promise<ID> {
    const { userContent, asstContent } = args_;

    const result = await pool.connect(async conn => {
        const userMem: Mem = await createMem(userContent);
        const asstMem: Mem = await createMem(asstContent);
        const xchgMem: Mem = await createMem(`# User:\n${userContent.trim()}\n\n---\n\n# Assistant:\n${asstContent.trim()}\n`);

        const userMetaId = nanoid();
        const asstMetaId = nanoid();
        const xchgMetaId = nanoid();

        const userMetaArgs = zodParse(ConversationMetaArgs, {
            kind: CONV,
            role: USER,
            source: 'conversation',
            docid: xchgMetaId,
        });

        const asstMetaArgs = zodParse(ConversationMetaArgs, {
            kind: CONV,
            role: ASSISTANT,
            source: 'conversation',
            docid: xchgMetaId,
        });

        const xchgMetaArgs = zodParse(ConvExchangeMetaArgs, {
            kind: XCHG,
        });

        const userID = await addMementoWithConn({ conn, mem: userMem, metaId: userMetaId, metaArgs: userMetaArgs });
        const asstID = await addMementoWithConn({ conn, mem: asstMem, metaId: asstMetaId, metaArgs: asstMetaArgs });
        const xchgID = await addMementoWithConn({ conn, mem: xchgMem, metaId: xchgMetaId, metaArgs: xchgMetaArgs });

        dlog('Added conversation exchange mementos:', { userID, asstID, xchgID });

        return xchgID;
    });

    return result;

}
