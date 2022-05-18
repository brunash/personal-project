import React from 'react';
import { Section, SectionText, SectionTitle } from '../../styles/GlobalComponents';
import Button from '../../styles/GlobalComponents/Button';
import { LeftSection } from './HeroStyles';

const Hero = (props) => (
  <Section row nopadding>
    <LeftSection>
      <SectionTitle main center>
        Hi, I'm Slobodan <br/>
        a Web Developer<br/>

      </SectionTitle>
      {/* <SectionText>
        

      </SectionText> */}
      {/* <Button onClick={() => window.location = 'https://google.com'}>Learn more</Button> */}
    </LeftSection>
  </Section>
);

export default Hero;