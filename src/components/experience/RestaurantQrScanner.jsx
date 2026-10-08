import {useEffect,useRef,useState} from 'react'

export default function RestaurantQrScanner({onToken,onClose}) {
  const video=useRef(null),[status,setStatus]=useState('Requesting camera permission…'),[retry,setRetry]=useState(0)
  useEffect(()=>{
    let active=true,stream,timer
    async function scan(){
      if(!globalThis.BarcodeDetector||!navigator.mediaDevices?.getUserMedia){setStatus('QR scanning is unavailable in this browser. Try another verification method.');return}
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}})
        if(!active){stream.getTracks().forEach(t=>t.stop());return}
        video.current.srcObject=stream;await video.current.play();setStatus('Scanning restaurant QR…')
        const detector=new BarcodeDetector({formats:['qr_code']}),started=Date.now()
        async function frame(){
          if(!active)return
          try{const codes=await detector.detect(video.current);if(codes[0]?.rawValue){stream.getTracks().forEach(t=>t.stop());onToken(codes[0].rawValue);return}
            if(Date.now()-started>45000){stream.getTracks().forEach(t=>t.stop());setStatus('No restaurant QR found. Try again.');return}
            timer=setTimeout(frame,250)
          }catch{setStatus('The QR could not be read. Try again.');stream.getTracks().forEach(t=>t.stop())}
        }
        frame()
      }catch{if(active)setStatus('Camera access was denied or unavailable. Try again or use another method.')}
    }
    scan();return()=>{active=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop())}
  },[retry,onToken])
  return <section className="visit-qr"><video ref={video} muted playsInline aria-label="Restaurant QR camera"/><p role="status">{status}</p><button type="button" onClick={()=>setRetry(v=>v+1)}>Try camera again</button><button type="button" onClick={onClose}>Cancel scanning</button></section>
}
