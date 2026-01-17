"use client";

import sword_crossing from '../../public/sword_crossing.png';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@mui/material";

export default function PromptArea({handleAddModel}: {handleAddModel: () => void}) {

  return (
    <div className="flex w-full">
        <div className="p-4 flex flex-col justify-center">
            <Button variant="contained" color="primary" onClick={handleAddModel}>
              Add a Model
            </Button>
        </div>
        <div className="flex-1 p-4 flex items-center">
          <textarea
              className="w-full h-32 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your prompt here..."
          ></textarea>
        </div>

        <Link href={'https://chatgpt.com/'} className="flex items-center">
          <Image src={sword_crossing} alt="Launch Request" width={200} height={200} />
        </Link>

    </div>
  );
}