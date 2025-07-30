export function BackgroundImage() {
  return (
    <div className='fixed inset-0 pointer-events-none z-0'>
      <div
        className='w-full h-full opacity-100'
        style={{
          backgroundImage: 'url(/Startrail.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    </div>
  )
}
