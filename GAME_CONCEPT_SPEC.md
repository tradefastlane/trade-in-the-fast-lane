# Trade in the Fast Lane — Concept Specification

## One-line pitch

A darkly comic multiplayer trading-and-life simulator in which friends compete to build wealth, status, and happiness while surviving volatile markets, reckless spending, and public financial ruin.

## What kind of indie game this is

**Primary genre:** Multiplayer social trading simulator  
**Secondary genres:** Digital board game, party game, life simulator, economic strategy  
**Tone:** Adult, cynical, satirical, chaotic, and darkly funny  
**Closest design shorthand:** *The Game of Life* and *Jones in the Fast Lane* rebuilt as a simultaneous real-time multiplayer trading game, with an FTMO-style competitive ladder.

This is not meant to be a serious broker simulator. Market knowledge should help, but the entertainment comes from the conflict between making money and living an unstable, expensive life.

## High concept

Each player begins as a small-time broker with:

- The same starting capital
- Basic accommodation and living expenses
- A happiness level
- Limited time and energy
- Access to the same simulated market

Players trade assets while also deciding how to spend their money and time. They may invest in education, better equipment, housing, entertainment, relationships, vice, or status. Those choices affect happiness, focus, expenses, trading ability, and social standing.

The winner is not necessarily the player with the largest account. Depending on the selected mode, success can combine:

- Net worth
- Trading performance
- Happiness
- Lifestyle and status
- Career rank
- Risk management

Players who go bankrupt suffer a theatrical, randomly selected dark-comedy elimination event that is broadcast to everyone in the match.

## The living board-game structure

The game should feel like a board game without using turns or requiring players to wait for one another.

All players act simultaneously in real time. They can trade, work, study, shop, socialize, improve their homes, and respond to life events whenever they choose. Time continues moving for everyone, so every action has an opportunity cost.

Instead of moving pieces around a traditional board, players move through life by allocating:

- Time
- Money
- Attention
- Energy
- Risk

The market clock and life calendar replace the dice and turn order of a normal board game.

### Two-screen design

The experience is divided into two conceptual screens:

#### Personal screen

Each player has a private personal interface containing:

- Trading charts and order controls
- Current positions
- Cash, debt, and available margin
- Personal opportunities and decisions
- Private messages, tips, and rumors
- Upcoming bills and obligations
- Detailed happiness, stress, energy, education, and relationship information

Other players should not automatically see every detail here.

#### Central screen

A shared central screen acts like the physical board placed in the middle of the table. Everyone can open it at any time, and it could also run continuously on a television or second monitor during local gatherings.

It shows an entertaining public summary of the entire group:

- Every player’s character and current activity
- Happiness and stress
- Publicly visible wealth or an approximate wealth tier
- Career and lifestyle status
- Current home, job, and major possessions
- Best recent trade
- Worst recent trade
- Recent promotions, purchases, breakups, disasters, and achievements
- Market headlines and major price movements
- Match clock and upcoming shared events
- Qualification and leaderboard positions

The central screen should feel alive rather than like a spreadsheet. Characters can visibly travel between work, school, shops, home, and entertainment locations while live status cards and news headlines explain what is happening.

### Public and private information

Not every statistic needs to be exact. Match settings can determine how much information players reveal:

- **Open-table mode:** Exact wealth, happiness, positions, and performance are public.
- **Social mode:** Lifestyle and emotional state are public, but portfolios remain private.
- **Competitive mode:** Only approximate wealth tiers, rankings, and notable trades are public.

This creates bluffing and social tension. A player may appear rich because of an expensive apartment while secretly carrying enormous debt.

### Local party presentation

The shared screen creates an especially strong “friends in a room” format:

- Each player uses their own computer, phone, or controller for private actions.
- A television displays the central board.
- Important trades, life events, and bankruptcies interrupt the board with short broadcasts.
- Players can still play online with the shared board available as a tab or window.

## Core fantasy

“My friends and I are reckless young brokers trying to become rich before our lifestyles, emotions, bad trades, and each other destroy us.”

## Design pillars

### 1. Trading that is readable and exciting

Players buy, sell, short, and manage positions using recognizable candlestick charts and market tools. The interface should feel authentic without requiring professional trading knowledge.

### 2. Your life interferes with your portfolio

Rent, happiness, education, relationships, addictions, equipment, and random events continuously compete for the same money used for trading.

### 3. Financial failure is public entertainment

Bankruptcy is not a quiet results screen. It becomes a dramatic shared event that interrupts or appears over every remaining player’s interface.

### 4. Friends create the real market volatility

Players compare results, mock bad trades, reveal or conceal positions, issue challenges, make side deals, and potentially manipulate one another through game mechanics.

### 5. Short matches feed a longer career

One-hour sessions should work as complete party-game matches, while strong players can qualify for daily, weekly, or monthly competitive events.

### 6. No turns and no waiting

Everyone is always doing something. Decisions use time, attention, travel, or recovery periods instead of consuming a turn. Players can queue longer activities while watching the market or central board.

## Core one-hour match

### Recommended player count

- Ideal: 4–8 players
- Minimum: 2 players
- Possible later expansion: 12–16 players

### Match structure

1. **Setup**
   - Players receive equal starting capital.
   - The host selects assets, volatility, life mechanics, and match length.

2. **Opening phase**
   - Players establish early positions.
   - Basic living costs and introductory opportunities appear.

3. **Escalation**
   - Market volatility increases.
   - Lifestyle expenses, opportunities, and personal crises become more demanding.
   - Players begin unlocking riskier instruments and actions.

4. **Panic phase**
   - Final market events create sharp price movement.
   - Debt, margin pressure, and player desperation peak.

5. **Market close**
   - Open positions are settled.
   - Scores are calculated.
   - Awards and qualification results are shown.

### Real-time pacing

The game world runs on a compressed clock. As an example, one real minute might represent one in-game day. Activities consume different amounts of that shared time:

- Placing a trade is nearly immediate.
- Shopping or entertainment takes a short period.
- Working a shift occupies time but produces dependable income.
- Studying takes longer but permanently improves the character.
- Sleeping or recovering restores performance while market opportunities continue.

Players therefore make “Game of Life” decisions without drawing cards or waiting for a turn.

### Suggested match lengths

- 15 minutes: Quick chaos
- 30 minutes: Standard party match
- 60 minutes: Competitive broker challenge
- Multi-session: Persistent life/career campaign

## Trading system

### Player actions

- Buy and sell assets
- Short assets
- Set stop-loss and take-profit orders
- Use leverage
- Review charts and indicators
- Follow news and event signals
- Manage margin and available cash

### Market approach

The initial game should use simulated or replayed market data presented through a TradingView-style chart interface. A later version could use appropriately licensed live or delayed market data.

Using simulated data gives the developers control over:

- Match duration
- Volatility
- Fairness
- Dramatic timing
- Anti-cheat measures
- Testing and repeatability

### Accessibility

Players should be able to choose:

- Beginner mode with suggestions and simplified order controls
- Standard mode
- Expert mode with leverage, shorting, and more advanced tools

## Life simulation

The life layer is what separates the game from a normal paper-trading contest.

### Core statistics

- Cash
- Portfolio value
- Debt
- Happiness
- Stress
- Energy or focus
- Reputation
- Education or trading skill

### Spending categories

- Rent and housing
- Food and basic needs
- Education and certifications
- Computers, screens, and data subscriptions
- Entertainment and nightlife
- Dating and relationships
- Adult vices and luxury services
- Transport
- Healthcare or stress recovery
- Status items

### Mechanical consequences

- Low happiness can reduce concentration or cause emotional-trading events.
- High stress can produce mistakes, forced cooldowns, or distorted information.
- Education can unlock better analysis tools.
- Better equipment can improve order speed or information clarity.
- Expensive lifestyles increase happiness and status but drain trading capital.
- Debt increases pressure and can lead to forced liquidation.

## Multiplayer interaction

### Essential social features

- Voice and text chat
- Public leaderboards during the match
- Optional hidden portfolio values
- Emotes and reactions
- Spectating after elimination
- A shared news/event feed

### Possible game actions

- Share or sell trading tips
- Challenge another player to a performance bet using in-game currency
- Form temporary investment clubs
- Leak or plant unreliable rumors
- Loan money to another player
- Place bounties or rewards around objectives
- Reveal another player’s risky position

Direct sabotage should be limited and clearly communicated so that trading skill still matters.

## Bankruptcy and elimination

Bankruptcy occurs when a player cannot meet required expenses or margin obligations and has no valid recovery option.

The original concept uses random suicide scenes as dark-comedy elimination sequences broadcast to every player. This can be retained as an optional mature-content presentation, but a commercially safer default would describe these as **broker breakdowns** or **career-ending meltdowns**. Examples can include disappearance, arrest, institutionalization, fleeing the country, joining a cult, or other absurd outcomes.

The presentation should be:

- Brief
- Stylized rather than realistic
- Darkly comic rather than emotionally sincere
- Skippable
- Replaceable with a reduced-content mode

This preserves the public humiliation and spectacle without making graphic self-harm the game’s only joke or identity.

## Winning and scoring

### Competitive score

A configurable final score could combine:

| Category | Example weight |
|---|---:|
| Final net worth | 40% |
| Trading return | 20% |
| Risk management | 15% |
| Happiness | 10% |
| Career/status | 10% |
| Special objectives | 5% |

### Match presets

- **Wolf of the Hour:** Highest net worth wins.
- **Balanced Life:** Wealth, happiness, and career all count.
- **Last Broker Standing:** Bankruptcy elimination until one player remains.
- **Funded Challenge:** Meet profit targets without violating drawdown rules.
- **Jones Mode:** Persistent life progression with jobs, education, housing, and long-term goals.

## Competitive meta-game

The FTMO-inspired layer turns individual matches into a recurring competition.

### Qualification structure

- Top daily performers receive invitations to a weekly event.
- Top weekly performers qualify for a monthly Trade-Off.
- Monthly winners earn cosmetic prestige, titles, trophies, and leaderboard placement.

### Fairness requirements

- No pay-to-win advantages
- Separate rankings by ruleset and match length
- Clearly defined drawdown and risk limits
- Anti-collusion and anti-cheat systems
- Prefer simulated or replayed market scenarios for ranked competition

## Persistent campaign option

The larger version can become a long-running multiplayer “Game of Life.”

Players would:

- Age through a broker career
- Study and gain qualifications
- Move between homes and financial districts
- Change employers or start a fund
- Build relationships and families
- Experience booms, recessions, and personal crises
- Retire, collapse, or leave a financial dynasty

This should be treated as the long-term vision, not the first release.

## Art direction

### Recommended style

- Stylized 2D or 2.5D presentation
- Late-1980s/1990s financial-office aesthetic mixed with modern trading screens
- Exaggerated character portraits and reaction animations
- Bright market UI contrasted against grimy apartments and absurd lifestyle scenes
- Digital-board-game layout rather than a fully explorable 3D world

This approach suits a small indie team and keeps character events inexpensive to produce.

## Audio direction

- Aggressive financial-news stings
- Phone alerts, ticker sounds, margin alarms, and office ambience
- Music that becomes faster and more unstable as the match approaches its end
- A deadpan announcer for bankruptcies, rankings, and market events

## User interface

The personal player screen should contain:

- Central chart and order controls
- Portfolio and margin summary
- Life statistics
- Current expenses and upcoming deadlines
- Player leaderboard
- Shared news feed
- Social/chat panel

The life layer should appear through fast cards, pop-ups, and short decisions so players are not pulled away from trading for long periods.

The shared board should prioritize spectacle and social readability over detailed controls. At a glance, players should understand who is winning financially, who is happiest, who is under pressure, and what dramatic event just occurred.

## Recommended MVP

Build the smallest version that proves the central joke and multiplayer tension:

- 4-player online multiplayer
- 30-minute and 60-minute matches
- One simulated market with 3–5 tradable assets
- Buy, sell, short, leverage, stop-loss, and margin calls
- Cash, portfolio value, happiness, and stress
- Rent plus a small set of lifestyle purchases
- 15–20 random life/market events
- Bankruptcy and 5 stylized elimination broadcasts
- Shared central board showing all four characters and their public status
- Public highlights for each player’s best and worst recent trades
- End-of-match leaderboard and awards
- Private friend lobbies

Do **not** begin with:

- A persistent open world
- Real-money trading or wagering
- A large number of live market integrations
- User-generated markets
- Full career simulation
- Public esports tournaments
- Dozens of asset classes

## Expansion roadmap

### Phase 1 — Party prototype

Prove that trading, life expenses, and public bankruptcy are entertaining together.

### Phase 2 — Replayability

Add characters, apartments, jobs, education, events, assets, cosmetics, and custom rules.

### Phase 3 — Competitive ladder

Add ranked challenges, daily qualification, weekly events, and the monthly Trade-Off.

### Phase 4 — Jones mode

Add persistent careers, long-term life choices, economic eras, and shared dynasties.

## Business model

Recommended:

- Premium indie game
- Cosmetic character, office, chart, and elimination packs
- Optional expansion packs for new cities, eras, and career systems

Avoid real-money wagering or purchasable trading advantages.

## Primary design risks

- Real market data may create licensing, reliability, fairness, and scheduling problems.
- Experienced traders could dominate beginners without simplified modes.
- Too much life simulation could distract from the multiplayer trading loop.
- Too little life simulation would make it feel like ordinary paper trading.
- Graphic suicide content could severely limit storefront, streaming, advertising, and age-rating options.
- Waiting after bankruptcy could become boring; eliminated players need spectating, prediction, or ghost-interaction mechanics.

## Product identity

The strongest version of the concept is:

> An adult multiplayer digital board game about trading—not a trading platform with a few jokes attached.

The one-hour friend match is the best first product. The persistent *Jones in the Fast Lane* career is the larger sequel or expansion hiding inside it.
