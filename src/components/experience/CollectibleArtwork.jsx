import locked from '../../assets/experience/locked.webp'

export function RarityBadge({ rarity, locked = false }) {
  return <span className={`rarity-badge rarity-${locked ? 'locked' : rarity}`}>{rarity[0].toUpperCase() + rarity.slice(1)}</span>
}

/** Cambodia variants are the only character artwork supplied by these Figma frames. */
export default function CollectibleArtwork({ collectible, country, isUnlocked, className = '' }) {
  const hasArtwork = country.id === 'cambodia'
  return <div className={`collectible-art ${!isUnlocked ? 'collectible-locked' : ''} ${className}`}>
    {isUnlocked && hasArtwork && <img className="collectible-glow" src={collectible.glow} alt="" />}
    <img className="collectible-character" src={isUnlocked && hasArtwork ? collectible.image : locked}
      alt={isUnlocked ? `${collectible.name}, ${country.name}${hasArtwork ? '' : ' artwork placeholder'}` : 'Locked collectible'} />
  </div>
}
