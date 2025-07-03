import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaLock, FaEye } from 'react-icons/fa';
import Hero from '../components/Hero';
import FeatureCard from '../components/ui/FeatureCard';
import Button from '../components/ui/Button';

const Home = () => {
  const navigate = useNavigate();

  const heroActions = (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
      <Button 
        onClick={() => navigate('/login')} 
        className="w-full sm:w-auto px-10 py-4 text-lg"
      >
        Voter Login
      </Button>
      <Button 
        onClick={() => navigate('/register')} 
        variant="outline"
        className="w-full sm:w-auto px-10 py-4 text-lg"
      >
        New Voter? Register Here
      </Button>
    </div>
  );

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Hero actions={heroActions} />

        <div className="py-20">
          <h2 className="text-4xl font-extrabold text-gray-900 text-center mb-12">
            Why Choose a Decentralized System?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <FeatureCard
              icon={<FaShieldAlt className="text-4xl text-blue-600" />}
              title="Enhanced Security"
            >
              Leveraging blockchain technology, your vote is cryptographically secure and tamper-proof.
            </FeatureCard>
            <FeatureCard
              icon={<FaLock className="text-4xl text-blue-600" />}
              title="Complete Anonymity"
            >
              Vote with confidence knowing your identity is protected through decentralized protocols.
            </FeatureCard>
            <FeatureCard
              icon={<FaEye className="text-4xl text-blue-600" />}
              title="Full Transparency"
            >
              All voting data is recorded on an immutable public ledger, ensuring transparent and auditable results.
            </FeatureCard>
          </div>
        </div>

        <div className="py-20 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
            Ready to Make Your Voice Heard?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join the revolution of decentralized democracy. Register to get started or view the current polls.
          </p>
          <Button onClick={() => navigate('/results')} variant="secondary">
            View Live Results
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
