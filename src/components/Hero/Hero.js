import React from 'react';

import { Section, SectionText, SectionTitle } from '../../styles/GlobalComponents';
import Button from '../../styles/GlobalComponents/Button';
import { LeftSection } from './HeroStyles';

const Hero = (props) => (
  <Section row nopadding>
    <LeftSection>
      <SectionTitle main center>
        Welcome to my <br/>
        portfolio page<br/>

      </SectionTitle>
      <SectionText>
        My name is Slobodan Zaja and I am a Full Stack Web Developer.
      </SectionText>
      {/* <Button onClick={() => window.location = 'https://google.com'}>Learn more</Button> */}
    </LeftSection>
  </Section>
);

export default Hero;