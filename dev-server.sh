#!/bin/bash
cd /home/san/performance-analyzer
FIFO=$(mktemp -u /tmp/next-stdin-XXXXXX)
mkfifo "$FIFO"
exec 3<>"$FIFO"        # hold write end open so Next.js never sees EOF
node node_modules/next/dist/bin/next dev < "$FIFO"
exec 3>&-
rm -f "$FIFO"
