import Link from "next/link"

const chatData: Chat[] = []

const ChatCard = () => {
  return (
    <div className='col-span-12 rounded-sm border border-stroke bg-white py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4'>
      <h4 className='mb-6 px-7.5 text-xl font-semibold text-black dark:text-white'>
        Chats
      </h4>
    </div>
  )
}

export default ChatCard
